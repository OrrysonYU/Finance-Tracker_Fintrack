import time
from datetime import timedelta
from unittest.mock import patch
from urllib.parse import parse_qs, urlencode, urlparse
import jwt

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec, rsa
from django.core.cache import cache
from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from users import oauth as oauth_module
from users.models import Identity, MFAChallenge, OAuthAttempt, User, UserSession
from users.throttles import AuthScopedRateThrottle
from users.oauth import OAuthError, VerifiedIdentity, _apple_client_secret, _digest, begin_apple_attempt, consume_attempt, resolve_apple_identity, verify_apple_code, begin_google_attempt, resolve_google_identity, verify_google_code


@override_settings(
    GOOGLE_OIDC_CLIENT_ID="client-id",
    GOOGLE_OIDC_CLIENT_SECRET="server-secret",
    GOOGLE_OIDC_REDIRECT_URI="http://127.0.0.1:5173/oauth/google/callback",
)
class GoogleOAuthSecurityTests(TestCase):
    def setUp(self):
        # The auth throttle history lives in the shared default cache; start each test
        # with a clean bucket so request counts never leak between OAuth tests.
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()
        self.user = User.objects.create_user(username="safe-user", email="safe@example.com", password="CorrectPass123!")

    def test_state_is_single_use_and_expiry_is_enforced(self):
        with patch("users.oauth.google_metadata", return_value={"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"}):
            result = begin_google_attempt()
        state = result["authorization_url"].split("state=", 1)[1].split("&", 1)[0]
        self.assertIsNotNone(consume_attempt(state))
        with self.assertRaises(OAuthError):
            consume_attempt(state)
        expired = OAuthAttempt.objects.create(state_hash="e" * 64, nonce_hash="n" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() - timedelta(seconds=1))
        with self.assertRaises(OAuthError):
            consume_attempt("expired")
        expired.delete()

    def test_missing_and_mismatched_state_are_rejected_without_provider_calls(self):
        with patch("users.views.verify_google_code") as verify:
            response = self.client.post("/api/auth/oauth/google/callback/", {"code": "code"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            response = self.client.post("/api/auth/oauth/google/callback/", {"state": "wrong", "code": "code"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            verify.assert_not_called()

    def test_new_verified_google_identity_creates_policy_compliant_user(self):
        identity = VerifiedIdentity("google", "google-sub-1", "New.User+tag@example.com", "Néw User", "Néw", "User")
        attempt = OAuthAttempt.objects.create(state_hash="a" * 64, nonce_hash="b" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        user, created = resolve_google_identity(identity, attempt)
        self.assertTrue(created)
        self.assertTrue(user.username.startswith("new.user"))
        self.assertTrue(Identity.objects.filter(user=user, provider="google", provider_subject="google-sub-1").exists())

    def test_same_email_requires_explicit_link_and_link_cannot_cross_accounts(self):
        identity = VerifiedIdentity("google", "google-sub-2", self.user.email, "Safe User", "Safe", "User")
        login_attempt = OAuthAttempt.objects.create(state_hash="c" * 64, nonce_hash="d" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        with self.assertRaisesMessage(OAuthError, "sign in another way"):
            resolve_google_identity(identity, login_attempt)
        link_attempt = OAuthAttempt.objects.create(state_hash="f" * 64, nonce_hash="g" * 64, provider="google", user=self.user, purpose="link", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        linked_user, linked = resolve_google_identity(identity, link_attempt)
        self.assertEqual(linked_user, self.user)
        self.assertTrue(linked)
        other = User.objects.create_user(username="other-user", email="other@example.com", password="CorrectPass123!")
        collision_attempt = OAuthAttempt.objects.create(state_hash="h" * 64, nonce_hash="i" * 64, provider="google", user=other, purpose="link", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        with self.assertRaises(OAuthError):
            resolve_google_identity(identity, collision_attempt)

    def test_oidc_claim_and_signature_failures_are_rejected(self):
        attempt = OAuthAttempt.objects.create(state_hash="m" * 64, nonce_hash="n" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        metadata = {"token_endpoint": "https://oauth2.googleapis.com/token", "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs"}
        failures = [jwt.ExpiredSignatureError(), jwt.InvalidIssuerError(), jwt.InvalidAudienceError(), jwt.InvalidSignatureError()]
        for failure in failures:
            with self.subTest(failure=type(failure).__name__), patch("users.oauth.google_metadata", return_value=metadata), patch("users.oauth._fetch_json", return_value={"id_token": "header.payload.signature"}), patch("users.oauth._signing_key", return_value=object()), patch("users.oauth.jwt.decode", side_effect=failure):
                with self.assertRaises(OAuthError):
                    verify_google_code("authorization-code", attempt)

    def test_unverified_email_and_nonce_mismatch_are_rejected(self):
        attempt = OAuthAttempt.objects.create(state_hash="o" * 64, nonce_hash="p" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
        metadata = {"token_endpoint": "https://oauth2.googleapis.com/token", "jwks_uri": "https://www.googleapis.com/oauth2/v3/certs"}
        claims = {"iss": "https://accounts.google.com", "sub": "sub", "aud": "client-id", "exp": int(timezone.now().timestamp()) + 300, "iat": int(timezone.now().timestamp()), "nonce": "wrong", "email": "verified@example.com", "email_verified": True}
        with patch("users.oauth.google_metadata", return_value=metadata), patch("users.oauth._fetch_json", return_value={"id_token": "token"}), patch("users.oauth._signing_key", return_value=object()), patch("users.oauth.jwt.decode", return_value=claims):
            with self.assertRaises(OAuthError):
                verify_google_code("code", attempt)
        with patch("users.oauth.secrets.compare_digest", return_value=True), patch("users.oauth.google_metadata", return_value=metadata), patch("users.oauth._fetch_json", return_value={"id_token": "token"}), patch("users.oauth._signing_key", return_value=object()), patch("users.oauth.jwt.decode", return_value={**claims, "email_verified": False}):
            with self.assertRaisesMessage(OAuthError, "verified Google email"):
                verify_google_code("code", attempt)

    @patch("users.views.verify_google_code")
    def test_callback_issues_normal_session_only_after_verified_identity(self, verify):
        verify.return_value = VerifiedIdentity("google", "verified-sub", "new@example.com", "New", "New", "")
        with patch("users.views.consume_attempt") as consume:
            attempt = OAuthAttempt.objects.create(state_hash="j" * 64, nonce_hash="k" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() + timedelta(minutes=5))
            consume.return_value = attempt
            response = self.client.post("/api/auth/oauth/google/callback/", {"state": "state", "code": "code"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertTrue(UserSession.objects.filter(user__email="new@example.com", authentication_method="google").exists())

    # --- regression coverage added during the P2-OAUTH-001 security review ---

    CALLBACK = "/api/auth/oauth/google/callback/"

    def _attempt(self, *, state="live-state", user=None, purpose="login"):
        return OAuthAttempt.objects.create(
            state_hash=_digest(state),
            nonce_hash=_digest(f"nonce-{state}"),
            provider="google",
            user=user,
            purpose=purpose,
            redirect_uri="http://127.0.0.1:5173/oauth/google/callback",
            expires_at=timezone.now() + timedelta(minutes=5),
        )

    def _identity_for(self, user, subject="linked-sub"):
        return Identity.objects.create(user=user, provider="google", provider_subject=subject, email=user.email, verified_at=timezone.now(), last_used_at=timezone.now())

    def test_link_callback_cannot_be_completed_by_another_party(self):
        attacker = User.objects.create_user(username="attacker", email="attacker@example.com", password="CorrectPass123!")
        victim_identity = VerifiedIdentity("google", "victim-sub", "victim@example.com", "Victim", "Victim", "User")

        with patch("users.views.verify_google_code", return_value=victim_identity) as verify:
            self._attempt(state="csrf-1", user=attacker, purpose="link")
            anonymous = self.client.post(self.CALLBACK, {"state": "csrf-1", "code": "code"}, format="json")

            self._attempt(state="csrf-2", user=attacker, purpose="link")
            self.client.force_authenticate(user=self.user)
            wrong_user = self.client.post(self.CALLBACK, {"state": "csrf-2", "code": "code"}, format="json")
            self.client.force_authenticate(user=None)

        self.assertEqual(anonymous.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(wrong_user.status_code, status.HTTP_400_BAD_REQUEST)
        # The provider exchange must not even be attempted, and no identity may be bound.
        verify.assert_not_called()
        self.assertFalse(Identity.objects.exists())
        # The state is still burned, so a stolen callback cannot be replayed by the owner.
        self.assertTrue(OAuthAttempt.objects.filter(state_hash=_digest("csrf-1"), used_at__isnull=False).exists())

    def test_link_callback_succeeds_for_the_attempt_owner(self):
        identity = VerifiedIdentity("google", "owner-sub", self.user.email, "Safe User", "Safe", "User")
        with patch("users.views.verify_google_code", return_value=identity):
            self._attempt(state="link-ok", user=self.user, purpose="link")
            self.client.force_authenticate(user=self.user)
            response = self.client.post(self.CALLBACK, {"state": "link-ok", "code": "code"}, format="json")
            self.client.force_authenticate(user=None)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["linked"])
        self.assertTrue(Identity.objects.filter(user=self.user, provider="google", provider_subject="owner-sub").exists())
        self.assertNotIn("access", response.data)

    def test_google_login_cannot_sign_in_a_deactivated_account(self):
        self._identity_for(self.user, subject="disabled-sub")
        self.user.is_active = False
        self.user.save(update_fields=("is_active",))
        identity = VerifiedIdentity("google", "disabled-sub", self.user.email, "Safe User", "Safe", "User")

        with patch("users.views.verify_google_code", return_value=identity):
            self._attempt(state="disabled")
            response = self.client.post(self.CALLBACK, {"state": "disabled", "code": "code"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("access", response.data)
        self.assertFalse(UserSession.objects.filter(user=self.user).exists())

    def test_google_login_never_bypasses_mfa(self):
        self._identity_for(self.user, subject="mfa-sub")
        self.user.mfa_enabled = True
        self.user.save(update_fields=("mfa_enabled",))
        identity = VerifiedIdentity("google", "mfa-sub", self.user.email, "Safe User", "Safe", "User")

        with patch("users.views.verify_google_code", return_value=identity):
            self._attempt(state="mfa")
            response = self.client.post(self.CALLBACK, {"state": "mfa", "code": "code"}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertFalse(UserSession.objects.filter(user=self.user).exists())
        self.assertEqual(MFAChallenge.objects.filter(user=self.user).count(), 1)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_provider_only_account_cannot_remove_its_last_sign_in_method(self):
        oauth_only = User.objects.create_user(username="oauth-only", email="oauth-only@example.com", password=None)
        self._identity_for(oauth_only, subject="only-sub")
        self.client.force_authenticate(user=oauth_only)
        response = self.client.delete("/api/auth/identities/google/", {"password": "irrelevant"}, format="json")
        self.client.force_authenticate(user=None)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("only sign-in method", response.data["detail"])
        self.assertTrue(Identity.objects.filter(user=oauth_only).exists())

    def test_start_endpoint_never_discloses_the_client_secret(self):
        with patch("users.oauth.google_metadata", return_value={"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"}):
            response = self.client.get("/api/auth/oauth/google/start/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        body = response.content.decode()
        self.assertNotIn("server-secret", body)
        self.assertIn("client_id=client-id", body)
        self.assertEqual(response["Cache-Control"], "no-store")

    def test_stale_attempts_are_purged_when_a_new_attempt_starts(self):
        stale = OAuthAttempt.objects.create(state_hash="z" * 64, nonce_hash="y" * 64, provider="google", redirect_uri="https://example.test/callback", expires_at=timezone.now() - timedelta(hours=1))
        with patch("users.oauth.google_metadata", return_value={"authorization_endpoint": "https://accounts.google.com/o/oauth2/v2/auth"}):
            begin_google_attempt()
        self.assertFalse(OAuthAttempt.objects.filter(pk=stale.pk).exists())
        self.assertEqual(OAuthAttempt.objects.count(), 1)


    def test_stale_bearer_token_does_not_break_login_but_fails_link_closed(self):
        # A browser can still hold an expired access token from an earlier session; that must
        # not turn a legitimate Google sign-in into a 401 before the view runs.
        self.client.credentials(HTTP_AUTHORIZATION="Bearer not-a-valid-token")
        identity = VerifiedIdentity("google", "stale-sub", "stale@example.com", "Stale", "Stale", "User")
        with patch("users.views.verify_google_code", return_value=identity):
            self._attempt(state="stale-login")
            login = self.client.post(self.CALLBACK, {"state": "stale-login", "code": "code"}, format="json")

            self._attempt(state="stale-link", user=self.user, purpose="link")
            link = self.client.post(self.CALLBACK, {"state": "stale-link", "code": "code"}, format="json")
        self.client.credentials()

        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertIn("access", login.data)
        self.assertEqual(link.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Identity.objects.filter(user=self.user).exists())


class GoogleOAuthAtomicityTests(TransactionTestCase):
    """Runs outside the per-test transaction that ``TestCase`` provides.

    ``resolve_google_identity`` and ``consume_attempt`` take row locks, so they must own an
    atomic block. Under ``TestCase`` a missing ``transaction.atomic`` is invisible because the
    test itself supplies one; in autocommit it raises ``TransactionManagementError`` at runtime.
    """

    reset_sequences = True

    def test_identity_resolution_owns_its_transaction(self):
        user = User.objects.create_user(username="atomic-user", email="atomic@example.com", password="CorrectPass123!")
        attempt = OAuthAttempt.objects.create(
            state_hash=_digest("atomic-state"),
            nonce_hash=_digest("atomic-nonce"),
            provider="google",
            user=user,
            purpose="link",
            redirect_uri="http://127.0.0.1:5173/oauth/google/callback",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        resolved, linked = resolve_google_identity(VerifiedIdentity("google", "atomic-sub", user.email, "Atomic", "Atomic", "User"), attempt)
        self.assertEqual(resolved, user)
        self.assertTrue(linked)

    def test_state_consumption_owns_its_transaction(self):
        OAuthAttempt.objects.create(
            state_hash=_digest("consume-state"),
            nonce_hash=_digest("consume-nonce"),
            provider="google",
            redirect_uri="http://127.0.0.1:5173/oauth/google/callback",
            expires_at=timezone.now() + timedelta(minutes=5),
        )
        self.assertIsNotNone(consume_attempt("consume-state"))
        with self.assertRaises(OAuthError):
            consume_attempt("consume-state")


@override_settings(
    APPLE_OIDC_CLIENT_ID="com.fintrack.web",
    APPLE_OIDC_TEAM_ID="TEAM123",
    APPLE_OIDC_KEY_ID="KEY123",
    APPLE_OIDC_PRIVATE_KEY="unused",
    APPLE_OIDC_REDIRECT_URI="http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/",
    FRONTEND_BASE_URL="http://127.0.0.1:5173",
)
class AppleOAuthImplementationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()
        self.user = User.objects.create_user(username="safe-user", email="safe@example.com", password="CorrectPass123!")

    def _attempt(self, state="apple-state", user=None, purpose="login"):
        return OAuthAttempt.objects.create(state_hash=_digest(state), nonce_hash=_digest(f"nonce-{state}"), provider="apple", user=user, purpose=purpose, redirect_uri="http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/", expires_at=timezone.now() + timedelta(minutes=5))

    def test_private_relay_identity_creates_and_reuses_account(self):
        identity = VerifiedIdentity("apple", "apple-sub", "relay@privaterelay.appleid.com", "", "", "")
        user, created = resolve_apple_identity(identity, self._attempt())
        self.assertTrue(created)
        self.assertEqual(user.email, "relay@privaterelay.appleid.com")
        repeat, created = resolve_apple_identity(VerifiedIdentity("apple", "apple-sub", "", "", "", ""), self._attempt("repeat"))
        self.assertEqual(repeat, user)
        self.assertFalse(created)

    def test_same_email_requires_explicit_link(self):
        identity = VerifiedIdentity("apple", "new-sub", self.user.email, "", "", "")
        with self.assertRaisesMessage(OAuthError, "connect Apple"):
            resolve_apple_identity(identity, self._attempt())

    def test_start_does_not_expose_signing_material(self):
        with patch("users.oauth.apple_metadata", return_value={"authorization_endpoint": "https://appleid.apple.com/auth/authorize"}):
            response = self.client.get("/api/auth/oauth/apple/start/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("unused", response.content.decode())
        self.assertIn("client_id=com.fintrack.web", response.content.decode())

    @patch("users.views.verify_apple_code")
    def test_mfa_apple_login_issues_challenge_without_tokens_or_session(self, verify):
        self.user.mfa_enabled = True
        self.user.save(update_fields=("mfa_enabled",))
        Identity.objects.create(user=self.user, provider="apple", provider_subject="mfa-sub", email=self.user.email, verified_at=timezone.now(), last_used_at=timezone.now())
        verify.return_value = VerifiedIdentity("apple", "mfa-sub", self.user.email, "", "", "")
        with patch("users.views.consume_attempt", return_value=self._attempt("mfa")):
            response = self.client.post("/api/auth/oauth/apple/callback/", {"state": "mfa", "code": "code"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("access", response.data)
        self.assertFalse(UserSession.objects.filter(user=self.user).exists())


APPLE_METADATA = {
    "issuer": "https://appleid.apple.com",
    "authorization_endpoint": "https://appleid.apple.com/auth/authorize",
    "token_endpoint": "https://appleid.apple.com/auth/token",
    "jwks_uri": "https://appleid.apple.com/auth/keys",
}
APPLE_DISCOVERY = "https://appleid.apple.com/.well-known/openid-configuration"
APPLE_EC_KEY = ec.generate_private_key(ec.SECP256R1()).private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
APPLE_SIGNING_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
APPLE_FOREIGN_KEY = rsa.generate_private_key(public_exponent=65537, key_size=2048)
APPLE_KID = "apple-signing-kid"


def apple_jwks(private_key=None, kid=APPLE_KID, **overrides):
    jwk = jwt.algorithms.RSAAlgorithm.to_jwk((private_key or APPLE_SIGNING_KEY).public_key(), as_dict=True)
    return {"keys": [{**jwk, "kid": kid, "use": "sig", "alg": "RS256", **overrides}]}


@override_settings(
    APPLE_OIDC_CLIENT_ID="com.fintrack.web",
    APPLE_OIDC_TEAM_ID="TEAM123456",
    APPLE_OIDC_KEY_ID="KEYID12345",
    APPLE_OIDC_PRIVATE_KEY=APPLE_EC_KEY,
    APPLE_OIDC_REDIRECT_URI="http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/",
    APPLE_OIDC_DISCOVERY_URL=APPLE_DISCOVERY,
    FRONTEND_BASE_URL="http://127.0.0.1:5173",
)
class AppleIdTokenVerificationTests(TestCase):
    """Apple ID tokens are checked against real RS256 signatures, never a mocked decode."""

    START = "/api/auth/oauth/apple/start/"
    CALLBACK = "/api/auth/oauth/apple/callback/"

    def setUp(self):
        oauth_module._JWKS_CACHE.clear()
        cache.clear()
        self.addCleanup(cache.clear)
        self.client = APIClient()

    def tearDown(self):
        oauth_module._JWKS_CACHE.clear()

    def _claims(self, nonce_value, **overrides):
        now = int(time.time())
        claims = {"iss": "https://appleid.apple.com", "sub": "001234.abcdef.0987", "aud": "com.fintrack.web", "exp": now + 600, "iat": now, "nonce": nonce_value, "email": "relay@privaterelay.appleid.com", "email_verified": "true", **overrides}
        return {key: value for key, value in claims.items() if value is not None}

    def _id_token(self, claims, key=None, kid=APPLE_KID, algorithm="RS256"):
        return jwt.encode(claims, key if key is not None else APPLE_SIGNING_KEY, algorithm=algorithm, headers={"kid": kid})

    def _fetch(self, id_token, jwks=None, metadata=None, tokens=None):
        def fetch(url, *, data=None, headers=None):
            if url == APPLE_DISCOVERY:
                return APPLE_METADATA if metadata is None else metadata
            if url == APPLE_METADATA["token_endpoint"]:
                return {"id_token": id_token} if tokens is None else tokens
            if url == APPLE_METADATA["jwks_uri"]:
                return apple_jwks() if jwks is None else jwks
            raise AssertionError(f"unexpected outbound request to {url}")

        return fetch

    def _start(self, user=None, purpose="login"):
        with patch("users.oauth._fetch_json", side_effect=self._fetch("unused")):
            payload = begin_apple_attempt(user=user, purpose=purpose) if user else self.client.get(self.START).data
        params = parse_qs(urlparse(payload["authorization_url"]).query)
        return params["state"][0], params["nonce"][0]

    def _callback(self, state, nonce, client=None, **claim_overrides):
        id_token = self._id_token(self._claims(nonce, **claim_overrides))
        oauth_module._JWKS_CACHE.clear()
        with patch("users.oauth._fetch_json", side_effect=self._fetch(id_token)):
            return (client or self.client).post(self.CALLBACK, {"state": state, "code": "apple-code"}, format="json")

    def _verify(self, id_token, **kwargs):
        attempt = OAuthAttempt.objects.create(state_hash=_digest("verify-state"), nonce_hash=_digest("verify-nonce"), provider="apple", redirect_uri="http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/", expires_at=timezone.now() + timedelta(minutes=5))
        oauth_module._JWKS_CACHE.clear()
        try:
            with patch("users.oauth._fetch_json", side_effect=self._fetch(id_token, **kwargs)):
                return verify_apple_code("apple-code", attempt)
        finally:
            attempt.delete()

    def test_genuinely_signed_token_yields_the_expected_identity(self):
        identity = self._verify(self._id_token(self._claims("verify-nonce")))
        self.assertEqual((identity.provider, identity.subject), ("apple", "001234.abcdef.0987"))
        self.assertEqual(identity.email, "relay@privaterelay.appleid.com")
        self.assertEqual((identity.display_name, identity.given_name, identity.family_name), ("", "", ""))

    def test_forged_signature_and_unknown_key_are_rejected(self):
        with self.assertRaises(OAuthError):
            self._verify(self._id_token(self._claims("verify-nonce"), key=APPLE_FOREIGN_KEY))
        with self.assertRaises(OAuthError):
            self._verify(self._id_token(self._claims("verify-nonce"), kid="not-apples-kid"))
        with self.assertRaises(OAuthError):
            self._verify(self._id_token(self._claims("verify-nonce")), jwks=apple_jwks(APPLE_FOREIGN_KEY))

    def test_unsigned_and_symmetric_tokens_are_rejected(self):
        claims = self._claims("verify-nonce")
        for algorithm, key in (("none", ""), ("HS256", "shared-secret-value-for-hmac-abuse")):
            with self.subTest(alg=algorithm), self.assertRaises(OAuthError):
                self._verify(jwt.encode(claims, key, algorithm=algorithm, headers={"kid": APPLE_KID}))

    def test_tampered_claims_are_rejected(self):
        now = int(time.time())
        cases = {
            "issuer": {"iss": "https://evil.example"},
            "audience": {"aud": "com.attacker.app"},
            "expired": {"exp": now - 600, "iat": now - 1200},
            "future_iat": {"iat": now + 3600},
            "missing_exp": {"exp": None},
            "missing_iat": {"iat": None},
            "missing_issuer": {"iss": None},
            "missing_audience": {"aud": None},
            "replayed_nonce": {"nonce": "attacker-chosen-nonce"},
            "missing_nonce": {"nonce": None},
            "missing_subject": {"sub": None},
            "blank_subject": {"sub": ""},
            "oversized_subject": {"sub": "x" * 256},
            "unverified_email": {"email_verified": "false"},
            "unverified_email_bool": {"email_verified": False},
            "missing_email_verified": {"email_verified": None},
            "malformed_email": {"email": "not-an-email"},
            "non_string_email": {"email": 1234},
        }
        for name, override in cases.items():
            with self.subTest(case=name), self.assertRaises(OAuthError):
                self._verify(self._id_token(self._claims("verify-nonce", **override)))

    def test_absent_email_is_reported_as_empty_rather_than_invented(self):
        identity = self._verify(self._id_token(self._claims("verify-nonce", email=None, email_verified=None)))
        self.assertEqual(identity.email, "")

    def test_malformed_tokens_and_token_responses_are_rejected(self):
        for bad in ("", "not.a.jwt", "a.b", "....", "x" * 4096):
            with self.subTest(token=bad[:8]), self.assertRaises(OAuthError):
                self._verify(bad)
        for tokens in ({}, {"id_token": None}, {"id_token": 42}, {"access_token": "opaque"}):
            with self.subTest(tokens=str(tokens)), self.assertRaises(OAuthError):
                self._verify("unused", tokens=tokens)

    def test_hostile_jwks_and_tampered_discovery_are_rejected(self):
        genuine = self._id_token(self._claims("verify-nonce"))
        for jwks in ({}, {"keys": "not-a-list"}, {"keys": []}, apple_jwks(alg="HS256"), {"keys": [{"kid": APPLE_KID, "kty": "oct", "k": "AAAAAAAA"}]}):
            with self.subTest(jwks=str(jwks)[:32]), self.assertRaises(OAuthError):
                self._verify(genuine, jwks=jwks)
        for field in ("issuer", "authorization_endpoint", "token_endpoint", "jwks_uri"):
            with self.subTest(metadata=field), self.assertRaises(OAuthError):
                self._verify(genuine, metadata={**APPLE_METADATA, field: "https://evil.example/pwn"})

    def test_client_secret_is_a_bounded_es256_assertion(self):
        secret = _apple_client_secret()
        header = jwt.get_unverified_header(secret)
        self.assertEqual((header["alg"], header["kid"]), ("ES256", "KEYID12345"))
        claims = jwt.decode(secret, options={"verify_signature": False})
        self.assertEqual((claims["iss"], claims["sub"], claims["aud"]), ("TEAM123456", "com.fintrack.web", "https://appleid.apple.com"))
        self.assertLessEqual(claims["exp"] - claims["iat"], 15777000)

    @override_settings(APPLE_OIDC_CLIENT_SECRET_LIFETIME_SECONDS=99999999)
    def test_client_secret_lifetime_is_capped_at_apples_maximum(self):
        claims = jwt.decode(_apple_client_secret(), options={"verify_signature": False})
        self.assertLessEqual(claims["exp"] - claims["iat"], 15777000)

    def test_login_binds_tokens_to_an_apple_session_and_honours_revocation(self):
        state, nonce = self._start()
        response = self._callback(state, nonce)
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(response["Cache-Control"], "no-store")
        session = UserSession.objects.get()
        self.assertEqual(session.authentication_method, "apple")
        self.assertEqual(jwt.decode(response.data["access"], options={"verify_signature": False})["sid"], str(session.id))
        UserSession.objects.update(revoked_at=timezone.now())
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": response.data["refresh"]}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    @override_settings(GOOGLE_OIDC_CLIENT_ID="google-client", GOOGLE_OIDC_CLIENT_SECRET="google-secret", GOOGLE_OIDC_REDIRECT_URI="http://127.0.0.1:5173/oauth/google/callback")
    def test_apple_state_cannot_be_redeemed_at_the_google_callback(self):
        state, _nonce = self._start()
        with patch("users.views.verify_google_code") as verify_google:
            response = self.client.post("/api/auth/oauth/google/callback/", {"state": state, "code": "apple-code"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        verify_google.assert_not_called()
        self.assertIsNone(OAuthAttempt.objects.get().used_at)
        self.assertFalse(Identity.objects.exists())

    def test_state_is_burned_after_use_and_cannot_be_replayed(self):
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_200_OK)
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(UserSession.objects.count(), 1)
        self.assertEqual(User.objects.count(), 1)

    def test_expired_attempt_is_rejected(self):
        state, nonce = self._start()
        OAuthAttempt.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

    def test_provider_error_burns_the_state_without_calling_apple(self):
        state, _nonce = self._start()
        with patch("users.oauth._fetch_json", side_effect=AssertionError("no outbound call expected")):
            response = self.client.post(self.CALLBACK, {"state": state, "error": "user_cancelled_authorize"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIsNotNone(OAuthAttempt.objects.get().used_at)
        self.assertFalse(User.objects.exists())

    def test_link_callback_requires_the_authenticated_attempt_owner(self):
        owner = User.objects.create_user(username="link-owner", email="owner@example.com", password="CorrectPass123!")
        attacker = User.objects.create_user(username="link-attacker", email="attacker@example.com", password="CorrectPass123!")
        state, nonce = self._start(user=owner, purpose="link")
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Identity.objects.exists())
        self.assertIsNotNone(OAuthAttempt.objects.get().used_at)
        state, nonce = self._start(user=owner, purpose="link")
        attacker_client = APIClient()
        attacker_client.force_authenticate(attacker)
        self.assertEqual(self._callback(state, nonce, client=attacker_client).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Identity.objects.exists())
        state, nonce = self._start(user=owner, purpose="link")
        owner_client = APIClient()
        owner_client.force_authenticate(owner)
        response = self._callback(state, nonce, client=owner_client)
        self.assertEqual(response.data, {"linked": True, "provider": "apple"})
        self.assertFalse(UserSession.objects.exists())
        self.assertEqual(Identity.objects.get().user, owner)

    def test_apple_identity_owned_by_another_user_cannot_be_grafted(self):
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_200_OK)
        owner = Identity.objects.get().user
        thief = User.objects.create_user(username="graft-thief", email="thief@example.com", password="CorrectPass123!")
        state, nonce = self._start(user=thief, purpose="link")
        thief_client = APIClient()
        thief_client.force_authenticate(thief)
        self.assertEqual(self._callback(state, nonce, client=thief_client).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(Identity.objects.get().user, owner)

    def test_deactivated_account_cannot_sign_in_with_apple(self):
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_200_OK)
        User.objects.update(is_active=False)
        UserSession.objects.all().delete()
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(UserSession.objects.exists())

    def test_existing_local_email_must_be_linked_rather_than_taken_over(self):
        User.objects.create_user(username="local-owner", email="relay@privaterelay.appleid.com", password="CorrectPass123!")
        state, nonce = self._start()
        response = self._callback(state, nonce)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("connect Apple", response.data["detail"])
        self.assertFalse(Identity.objects.exists())

    def test_repeat_sign_in_keeps_the_stored_email_but_records_a_changed_one(self):
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce).status_code, status.HTTP_200_OK)
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce, email=None, email_verified=None).status_code, status.HTTP_200_OK)
        self.assertEqual(Identity.objects.get().email, "relay@privaterelay.appleid.com")
        state, nonce = self._start()
        self.assertEqual(self._callback(state, nonce, email="moved@privaterelay.appleid.com").status_code, status.HTTP_200_OK)
        self.assertEqual(Identity.objects.get().email, "moved@privaterelay.appleid.com")



@override_settings(
    APPLE_OIDC_CLIENT_ID="com.fintrack.web",
    APPLE_OIDC_TEAM_ID="TEAM123456",
    APPLE_OIDC_KEY_ID="KEYID12345",
    APPLE_OIDC_PRIVATE_KEY=APPLE_EC_KEY,
    APPLE_OIDC_REDIRECT_URI="http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/",
    APPLE_OIDC_DISCOVERY_URL=APPLE_DISCOVERY,
    FRONTEND_BASE_URL="http://127.0.0.1:5173",
)
class AppleFormPostBridgeTests(TestCase):
    """Apple form-POSTs its response to the backend; the bridge is transport only."""

    START = "/api/auth/oauth/apple/start/"
    BRIDGE = "/api/auth/oauth/apple/form-callback/"
    CALLBACK = "/api/auth/oauth/apple/callback/"
    SPA_CALLBACK = "http://127.0.0.1:5173/oauth/apple/callback"

    def setUp(self):
        oauth_module._JWKS_CACHE.clear()
        cache.clear()
        # These cases replay one browser hop many times over, which the production
        # auth_oauth limit would legitimately throttle. DRF binds THROTTLE_RATES at import,
        # so the project convention is to patch the class attribute; the production limit
        # keeps its own dedicated regression test.
        rates = {**AuthScopedRateThrottle.THROTTLE_RATES, "auth_oauth": "10000/minute"}
        throttle_rates = patch.object(AuthScopedRateThrottle, "THROTTLE_RATES", rates)
        throttle_rates.start()
        self.addCleanup(throttle_rates.stop)
        self.addCleanup(cache.clear)
        self.client = APIClient()

    def tearDown(self):
        oauth_module._JWKS_CACHE.clear()

    def _fetch(self, id_token="unused", jwks=None, metadata=None, tokens=None):
        def fetch(url, *, data=None, headers=None):
            if url == APPLE_DISCOVERY:
                return APPLE_METADATA if metadata is None else metadata
            if url == APPLE_METADATA["token_endpoint"]:
                return {"id_token": id_token} if tokens is None else tokens
            if url == APPLE_METADATA["jwks_uri"]:
                return apple_jwks() if jwks is None else jwks
            raise AssertionError(f"unexpected outbound request to {url}")

        return fetch

    def _authorization_params(self):
        with patch("users.oauth._fetch_json", side_effect=self._fetch()):
            payload = self.client.get(self.START).data
        return parse_qs(urlparse(payload["authorization_url"]).query)

    def _start(self, user=None, purpose="login"):
        with patch("users.oauth._fetch_json", side_effect=self._fetch()):
            payload = begin_apple_attempt(user=user, purpose=purpose) if user else self.client.get(self.START).data
        params = parse_qs(urlparse(payload["authorization_url"]).query)
        return params["state"][0], params["nonce"][0]

    def _form_post(self, data, content_type="application/x-www-form-urlencoded"):
        """Reproduce Apple's cross-site POST: no Fintrack credentials, form encoding."""
        return APIClient().post(self.BRIDGE, urlencode(data), content_type=content_type)

    def _bridged(self, response):
        self.assertEqual(response.status_code, 303)
        location = urlparse(response["Location"])
        self.assertEqual(f"{location.scheme}://{location.netloc}{location.path}", self.SPA_CALLBACK)
        return {key: values[0] for key, values in parse_qs(location.query).items()}

    def _complete(self, state, nonce, client=None, **claim_overrides):
        """Finish the flow the way the SPA does: a JSON POST to the authoritative callback."""
        now = int(time.time())
        claims = {"iss": "https://appleid.apple.com", "sub": "001234.abcdef.0987", "aud": "com.fintrack.web", "exp": now + 600, "iat": now, "nonce": nonce, "email": "relay@privaterelay.appleid.com", "email_verified": "true", **claim_overrides}
        id_token = jwt.encode({key: value for key, value in claims.items() if value is not None}, APPLE_SIGNING_KEY, algorithm="RS256", headers={"kid": APPLE_KID})
        oauth_module._JWKS_CACHE.clear()
        with patch("users.oauth._fetch_json", side_effect=self._fetch(id_token)):
            return (client or self.client).post(self.CALLBACK, {"state": state, "code": "apple-code"}, format="json")

    def test_authorization_request_asks_apple_for_a_form_post_response(self):
        params = self._authorization_params()
        self.assertEqual(params["response_mode"], ["form_post"])
        self.assertEqual(params["scope"], ["openid email"])
        self.assertEqual(params["response_type"], ["code"])
        # Apple's Return URL is the backend bridge, not the SPA route it forwards to.
        self.assertEqual(params["redirect_uri"], ["http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/"])
        self.assertEqual(OAuthAttempt.objects.get().redirect_uri, "http://127.0.0.1:8000/api/auth/oauth/apple/form-callback/")

    def test_apple_form_post_is_bridged_to_the_trusted_spa_route(self):
        state, _nonce = self._start()
        response = self._form_post({"state": state, "code": "apple-code"})
        self.assertEqual(self._bridged(response), {"state": state, "code": "apple-code"})
        self.assertEqual(response["Cache-Control"], "no-store")
        self.assertEqual(response["Referrer-Policy"], "no-referrer")
        self.assertEqual(response.content, b"")

    def test_bridge_accepts_multipart_and_forwards_nothing_else(self):
        state, _nonce = self._start()
        response = APIClient().post(self.BRIDGE, {"state": state, "code": "apple-code", "id_token": "eyJhbGciOi.forged.payload", "user": '{"name": {"firstName": "Ada"}}', "redirect_uri": "https://evil.example/steal", "next": "https://evil.example"}, format="multipart")
        self.assertEqual(self._bridged(response), {"state": state, "code": "apple-code"})

    def test_hostile_provider_values_never_cross_the_bridge(self):
        hostile = [
            "https://evil.example/steal",
            "state with spaces",
            "state" + chr(13) + chr(10) + "Location: https://evil.example",
            "<script>alert(1)</script>",
            "state#fragment",
            "state?next=https://evil.example",
            "state&code=injected",
            "state%0d%0aSet-Cookie:%20a=b",
            "state" + chr(0),
            "A" * 2049,
        ]
        for value in hostile:
            with self.subTest(value=value[:40]):
                params = self._bridged(self._form_post({"state": value, "code": value, "error": value}))
                self.assertEqual(params, {})

    def test_bridge_does_not_consume_or_trust_the_stored_attempt(self):
        state, nonce = self._start()
        for _ in range(3):
            self.assertEqual(self._bridged(self._form_post({"state": state, "code": "apple-code"})), {"state": state, "code": "apple-code"})
        # A duplicated form post must not burn the state: the SPA has not run yet.
        self.assertIsNone(OAuthAttempt.objects.get().used_at)
        self.assertFalse(Identity.objects.exists())
        self.assertEqual(self._complete(state, nonce).status_code, status.HTTP_200_OK)
        self.assertIsNotNone(OAuthAttempt.objects.get().used_at)

    def test_bridge_answers_only_to_post(self):
        state, _nonce = self._start()
        for method in ("get", "put", "patch", "delete"):
            with self.subTest(method=method):
                response = getattr(APIClient(), method)(f"{self.BRIDGE}?state={state}&code=apple-code")
                self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        self.assertIsNone(OAuthAttempt.objects.get().used_at)

    def test_redirect_target_is_never_taken_from_the_request(self):
        state, _nonce = self._start()
        response = APIClient().post(
            f"{self.BRIDGE}?next=https://evil.example&redirect_uri=https://evil.example",
            urlencode({"state": state, "code": "apple-code", "redirect_uri": "https://evil.example", "return_to": "//evil.example", "state_url": "https://evil.example"}),
            content_type="application/x-www-form-urlencoded",
            HTTP_HOST="testserver",
            HTTP_X_FORWARDED_HOST="evil.example",
            HTTP_ORIGIN="https://appleid.apple.com",
            HTTP_REFERER="https://evil.example",
        )
        self.assertEqual(self._bridged(response), {"state": state, "code": "apple-code"})
        self.assertNotIn("evil.example", response["Location"])

    def test_untrusted_frontend_configuration_disables_the_flow_instead_of_redirecting(self):
        state, _nonce = self._start()
        hostile_origins = [
            "https://evil.example@127.0.0.1:5173",
            "//evil.example",
            "javascript:alert(1)",
            "http://evil.example",
            "data:text/html,<script>alert(1)</script>",
            "http://127.0.0.1:5173?next=https://evil.example",
            "",
        ]
        for origin in hostile_origins:
            with self.subTest(origin=origin):
                with override_settings(FRONTEND_BASE_URL=origin):
                    response = self._form_post({"state": state, "code": "apple-code"})
                    self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
                    self.assertNotIn("Location", response)
                    self.assertEqual(response["Cache-Control"], "no-store")
                    # A flow that could not be completed must not start either.
                    self.assertEqual(self.client.get(self.START).status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIsNone(OAuthAttempt.objects.get().used_at)

    def test_missing_and_malformed_submissions_reach_the_spa_error_path(self):
        for body, content_type in (
            ({}, "application/x-www-form-urlencoded"),
            ({"code": "apple-code"}, "application/x-www-form-urlencoded"),
            ({"state": ""}, "application/x-www-form-urlencoded"),
        ):
            with self.subTest(body=body):
                params = self._bridged(self._form_post(body, content_type=content_type))
                self.assertNotIn("state", params)
        broken = APIClient().post(self.BRIDGE, ("--x" + chr(13) + chr(10) + "Content-Disposition: form-data;").encode(), content_type="multipart/form-data; boundary=x")
        self.assertEqual(self._bridged(broken), {})
        unsupported = APIClient().post(self.BRIDGE, '{"state": "json-state"}', content_type="application/json")
        self.assertEqual(unsupported.status_code, status.HTTP_415_UNSUPPORTED_MEDIA_TYPE)

    def test_provider_error_is_forwarded_and_burned_by_the_authoritative_callback(self):
        state, _nonce = self._start()
        params = self._bridged(self._form_post({"state": state, "error": "user_cancelled_authorize"}))
        self.assertEqual(params, {"state": state, "error": "user_cancelled_authorize"})
        with patch("users.oauth._fetch_json", side_effect=AssertionError("no outbound call expected")):
            response = self.client.post(self.CALLBACK, {"state": params["state"], "error": params["error"]}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertNotIn("user_cancelled_authorize", response.content.decode())
        self.assertIsNotNone(OAuthAttempt.objects.get().used_at)
        self.assertFalse(User.objects.exists())

    def test_state_failures_are_still_enforced_after_the_bridge_hop(self):
        state, nonce = self._start()
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        OAuthAttempt.objects.update(expires_at=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self._complete(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.exists())

        OAuthAttempt.objects.all().delete()
        state, nonce = self._start()
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        self.assertEqual(self._complete(state, nonce).status_code, status.HTTP_200_OK)
        self.assertEqual(self._complete(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(UserSession.objects.count(), 1)

        forged = "F" * 43
        self.assertEqual(self._bridged(self._form_post({"state": forged, "code": "apple-code"})), {"state": forged, "code": "apple-code"})
        self.assertEqual(self._complete(forged, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Identity.objects.count(), 1)

    def test_bridged_login_creates_the_normal_session_and_token_state(self):
        state, nonce = self._start()
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        response = self._complete(state, nonce)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        session = UserSession.objects.get()
        self.assertEqual(str(session.id), str(jwt.decode(response.data["access"], options={"verify_signature": False})["sid"]))
        self.assertEqual(session.authentication_method, "apple")
        self.assertEqual(Identity.objects.get().provider_subject, "001234.abcdef.0987")
        self.assertEqual(response.data["user"]["email"], "relay@privaterelay.appleid.com")

    def test_bridged_login_never_bypasses_mfa(self):
        user = User.objects.create_user(username="apple-mfa", email="relay@privaterelay.appleid.com", password="CorrectPass123!")
        user.mfa_enabled = True
        user.save(update_fields=("mfa_enabled",))
        Identity.objects.create(user=user, provider="apple", provider_subject="001234.abcdef.0987", email=user.email, verified_at=timezone.now(), last_used_at=timezone.now())
        state, nonce = self._start()
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        response = self._complete(state, nonce)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        self.assertFalse(UserSession.objects.exists())
        self.assertEqual(MFAChallenge.objects.filter(user=user).count(), 1)

    def test_bridged_link_flow_keeps_owner_binding_and_blocks_grafting(self):
        owner = User.objects.create_user(username="bridge-owner", email="owner@example.com", password="CorrectPass123!")
        attacker = User.objects.create_user(username="bridge-attacker", email="attacker@example.com", password="CorrectPass123!")
        attacker_client = APIClient()
        attacker_client.force_authenticate(attacker)

        state, nonce = self._start(user=attacker, purpose="link")
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        # The victim's browser follows the bridge redirect while signed in as the victim.
        owner_client = APIClient()
        owner_client.force_authenticate(owner)
        self.assertEqual(self._complete(state, nonce, client=owner_client).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Identity.objects.exists())

        OAuthAttempt.objects.all().delete()
        state, nonce = self._start(user=owner, purpose="link")
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        self.assertEqual(self._complete(state, nonce).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self._complete(state, nonce, client=attacker_client).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(Identity.objects.exists())

        OAuthAttempt.objects.all().delete()
        state, nonce = self._start(user=owner, purpose="link")
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        self.assertEqual(self._complete(state, nonce, client=owner_client).data, {"linked": True, "provider": "apple"})
        self.assertEqual(Identity.objects.get().user, owner)

        OAuthAttempt.objects.all().delete()
        state, nonce = self._start(user=attacker, purpose="link")
        self._bridged(self._form_post({"state": state, "code": "apple-code"}))
        self.assertEqual(self._complete(state, nonce, client=attacker_client).status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Identity.objects.count(), 1)
        self.assertEqual(Identity.objects.get().user, owner)
        self.assertFalse(UserSession.objects.exists())

    def test_bridge_response_carries_no_provider_or_account_secrets(self):
        state, _nonce = self._start()
        response = self._form_post({"state": state, "code": "apple-code", "id_token": "eyJhbGciOiJSUzI1NiJ9.apple.signature"})
        serialized = f"{response.serialize_headers().decode()}{response.content.decode()}"
        for secret in ("TEAM123456", "KEYID12345", "BEGIN PRIVATE KEY", "client_secret", "id_token", "refresh", APPLE_EC_KEY.splitlines()[1]):
            with self.subTest(secret=secret[:24]):
                self.assertNotIn(secret, serialized)
