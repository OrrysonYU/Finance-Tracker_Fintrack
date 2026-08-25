from datetime import timedelta
from unittest.mock import patch
import jwt

from django.test import TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from users.models import Identity, MFAChallenge, OAuthAttempt, User, UserSession
from users.oauth import OAuthError, VerifiedIdentity, _digest, begin_google_attempt, consume_attempt, resolve_google_identity, verify_google_code


@override_settings(
    GOOGLE_OIDC_CLIENT_ID="client-id",
    GOOGLE_OIDC_CLIENT_SECRET="server-secret",
    GOOGLE_OIDC_REDIRECT_URI="http://127.0.0.1:5173/oauth/google/callback",
)
class GoogleOAuthSecurityTests(TestCase):
    def setUp(self):
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
