import time
from datetime import timedelta
from unittest import mock

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core import signing
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from users.mfa import totp_code
from users.models import MFAChallenge, MFAConfiguration, MFARecoveryCode
from users.throttles import AuthScopedRateThrottle


class MFAApiTest(APITestCase):
    password = "StrongPass123!"
    base_time = 1_700_000_000

    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="mfa-user", email="mfa@example.com", password=self.password
        )
        login = self.client.post(
            "/api/auth/token/",
            {"username": self.user.username, "password": self.password},
            format="json",
        )
        self.original_access = login.data["access"]
        self.original_refresh = login.data["refresh"]
        self.authenticate(login.data["access"])

    def authenticate(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def clear_auth(self):
        self.client.credentials()

    def enroll(self):
        start = self.client.post("/api/auth/mfa/enroll/", {"password": self.password}, format="json")
        self.assertEqual(start.status_code, status.HTTP_200_OK, start.data)
        self.assertIn("otpauth://totp/", start.data["provisioning_uri"])
        with mock.patch("users.mfa.time.time", return_value=self.base_time):
            confirm = self.client.post(
                "/api/auth/mfa/enroll/confirm/",
                {"code": totp_code(start.data["secret"], timestamp=self.base_time)},
                format="json",
            )
        self.assertEqual(confirm.status_code, status.HTTP_200_OK, confirm.data)
        self.authenticate(confirm.data["access"])
        self.secret = start.data["secret"]
        self.recovery_codes = confirm.data["recovery_codes"]
        return start, confirm

    def login_challenge(self):
        self.clear_auth()
        response = self.client.post(
            "/api/auth/token/",
            {"username": self.user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertTrue(response.data["mfa_required"])
        self.assertNotIn("access", response.data)
        self.assertNotIn("refresh", response.data)
        return response.data["mfa_challenge"]

    def test_mfa_disabled_login_uses_existing_token_contract(self):
        self.clear_auth()
        response = self.client.post(
            "/api/auth/token/",
            {"username": self.user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertFalse(response.data.get("mfa_required", False))

    def test_enrollment_requires_password_and_invalid_code_never_enables(self):
        denied = self.client.post("/api/auth/mfa/enroll/", {}, format="json")
        self.assertEqual(denied.status_code, status.HTTP_400_BAD_REQUEST)
        start = self.client.post("/api/auth/mfa/enroll/", {"password": self.password}, format="json")
        invalid = self.client.post("/api/auth/mfa/enroll/confirm/", {"code": "000000"}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertFalse(self.user.mfa_enabled)
        self.assertFalse(MFAConfiguration.objects.filter(user=self.user).exists())
        self.assertNotIn(start.data["secret"], str(invalid.data))

    def test_successful_enrollment_encrypts_secret_and_returns_codes_once(self):
        start, confirm = self.enroll()
        self.user.refresh_from_db()
        config = MFAConfiguration.objects.get(user=self.user)
        self.assertTrue(self.user.mfa_enabled)
        self.assertNotEqual(bytes(config.secret_encrypted).decode("ascii"), start.data["secret"])
        self.assertEqual(len(confirm.data["recovery_codes"]), 10)
        self.assertEqual(len(set(confirm.data["recovery_codes"])), 10)
        self.assertFalse(MFARecoveryCode.objects.filter(code_hash__in=confirm.data["recovery_codes"]).exists())
        self.assertNotIn("secret", self.client.get("/api/auth/mfa/status/").data)
        self.assertNotIn("mfa", self.client.get("/api/auth/me/").data)

    def test_mfa_login_totp_success_invalid_replay_and_challenge_replay(self):
        self.enroll()
        first = self.login_challenge()
        second = self.login_challenge()
        code = totp_code(self.secret, timestamp=self.base_time + 30)
        with mock.patch("users.mfa.time.time", return_value=self.base_time + 30):
            invalid = self.client.post("/api/auth/mfa/challenge/", {"challenge": first, "code": "not-a-code"}, format="json")
            success = self.client.post("/api/auth/mfa/challenge/", {"challenge": first, "code": code}, format="json")
            reused_code = self.client.post("/api/auth/mfa/challenge/", {"challenge": second, "code": code}, format="json")
            reused_challenge = self.client.post("/api/auth/mfa/challenge/", {"challenge": first, "code": code}, format="json")
        self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(success.status_code, status.HTTP_200_OK, success.data)
        self.assertIn("access", success.data)
        self.assertEqual(reused_code.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(reused_challenge.status_code, status.HTTP_400_BAD_REQUEST)

    def test_expired_malformed_and_exhausted_challenges_are_rejected(self):
        self.enroll()
        challenge = self.login_challenge()
        MFAChallenge.objects.filter(user=self.user, used_at__isnull=True).update(expires_at=timezone.now() - timedelta(seconds=1))
        expired = self.client.post("/api/auth/mfa/challenge/", {"challenge": challenge, "code": "123456"}, format="json")
        malformed = self.client.post("/api/auth/mfa/challenge/", {"challenge": "malformed", "code": "123456"}, format="json")
        self.assertEqual(expired.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(malformed.status_code, status.HTTP_400_BAD_REQUEST)
        active = self.login_challenge()
        for _ in range(settings.MFA_MAX_CHALLENGE_ATTEMPTS):
            response = self.client.post("/api/auth/mfa/challenge/", {"challenge": active, "code": "000000"}, format="json")
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        valid = totp_code(self.secret, timestamp=self.base_time + 30)
        with mock.patch("users.mfa.time.time", return_value=self.base_time + 30):
            locked = self.client.post("/api/auth/mfa/challenge/", {"challenge": active, "code": valid}, format="json")
        self.assertEqual(locked.status_code, status.HTTP_400_BAD_REQUEST)

    def test_repeated_mfa_attempts_are_rate_limited(self):
        self.enroll()
        cache.clear()
        challenge = self.login_challenge()
        rates = {**AuthScopedRateThrottle.THROTTLE_RATES, "auth_mfa": "2/minute"}
        with mock.patch.object(AuthScopedRateThrottle, "THROTTLE_RATES", rates):
            for _ in range(2):
                response = self.client.post("/api/auth/mfa/challenge/", {"challenge": challenge, "code": "000000"}, format="json")
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            throttled = self.client.post("/api/auth/mfa/challenge/", {"challenge": challenge, "code": "000000"}, format="json")
        self.assertEqual(throttled.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_recovery_code_is_single_use_and_use_is_recorded(self):
        self.enroll()
        recovery = self.recovery_codes[0]
        challenge = self.login_challenge()
        success = self.client.post("/api/auth/mfa/challenge/", {"challenge": challenge, "code": recovery}, format="json")
        self.assertEqual(success.status_code, status.HTTP_200_OK, success.data)
        record = MFARecoveryCode.objects.get(code_hash__isnull=False, configuration__user=self.user, used_at__isnull=False)
        self.assertIsNotNone(record.used_at)
        replay = self.client.post("/api/auth/mfa/challenge/", {"challenge": self.login_challenge(), "code": recovery}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_400_BAD_REQUEST)

    def test_recovery_regeneration_invalidates_old_codes(self):
        self.enroll()
        old_code = self.recovery_codes[0]
        with mock.patch("users.mfa.time.time", return_value=self.base_time + 30):
            regenerated = self.client.post(
                "/api/auth/mfa/recovery-codes/",
                {"password": self.password, "code": totp_code(self.secret, timestamp=self.base_time + 30)},
                format="json",
            )
        self.assertEqual(regenerated.status_code, status.HTTP_200_OK, regenerated.data)
        self.assertEqual(len(regenerated.data["recovery_codes"]), 10)
        rejected = self.client.post("/api/auth/mfa/challenge/", {"challenge": self.login_challenge(), "code": old_code}, format="json")
        self.assertEqual(rejected.status_code, status.HTTP_400_BAD_REQUEST)

    def test_disable_requires_password_and_second_factor_then_revokes_old_session(self):
        self.enroll()
        access_before_disable = self.client._credentials["HTTP_AUTHORIZATION"].split(" ", 1)[1]
        missing = self.client.post("/api/auth/mfa/disable/", {"password": self.password}, format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        wrong_password = self.client.post("/api/auth/mfa/disable/", {"password": "wrong", "code": self.recovery_codes[0]}, format="json")
        self.assertEqual(wrong_password.status_code, status.HTTP_400_BAD_REQUEST)
        success = self.client.post("/api/auth/mfa/disable/", {"password": self.password, "code": self.recovery_codes[0]}, format="json")
        self.assertEqual(success.status_code, status.HTTP_200_OK, success.data)
        self.user.refresh_from_db()
        self.assertFalse(self.user.mfa_enabled)
        self.assertFalse(MFAConfiguration.objects.filter(user=self.user).exists())
        self.authenticate(access_before_disable)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.authenticate(success.data["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)

    def test_security_state_changes_invalidate_old_refresh_and_new_refresh_rotates(self):
        _, confirm = self.enroll()
        self.clear_auth()
        old_refresh = self.client.post("/api/auth/token/refresh/", {"refresh": self.original_refresh}, format="json")
        self.assertEqual(old_refresh.status_code, status.HTTP_401_UNAUTHORIZED)
        current = self.client.post("/api/auth/token/refresh/", {"refresh": confirm.data["refresh"]}, format="json")
        self.assertEqual(current.status_code, status.HTTP_200_OK, current.data)

    def test_logout_after_mfa_revokes_access_and_refresh(self):
        self.enroll()
        challenge = self.login_challenge()
        with mock.patch("users.mfa.time.time", return_value=self.base_time + 30):
            authenticated = self.client.post(
                "/api/auth/mfa/challenge/",
                {"challenge": challenge, "code": totp_code(self.secret, timestamp=self.base_time + 30)},
                format="json",
            )
        self.authenticate(authenticated.data["access"])
        logout = self.client.post("/api/auth/logout/", {"refresh": authenticated.data["refresh"]}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.clear_auth()
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": authenticated.data["refresh"]}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_password_reset_preserves_mfa_and_next_login_requires_challenge(self):
        self.enroll()
        uid = signing.dumps({"user_id": self.user.pk}, salt="fintrack-password-reset")
        token = default_token_generator.make_token(self.user)
        new_password = "NewStrongPass123!"
        self.clear_auth()
        reset = self.client.post(
            "/api/auth/password-reset/confirm/",
            {"uid": uid, "token": token, "password": new_password, "password_confirm": new_password},
            format="json",
        )
        self.assertEqual(reset.status_code, status.HTTP_200_OK, reset.data)
        login = self.client.post("/api/auth/token/", {"username": self.user.username, "password": new_password}, format="json")
        self.assertTrue(login.data["mfa_required"])
        self.assertNotIn("access", login.data)

    def test_mfa_management_is_scoped_to_authenticated_user(self):
        self.enroll()
        other = get_user_model().objects.create_user(username="other-mfa", email="other@example.com", password=self.password)
        other_login = self.client.post("/api/auth/token/", {"username": other.username, "password": self.password}, format="json")
        self.authenticate(other_login.data["access"])
        status_response = self.client.get("/api/auth/mfa/status/")
        self.assertFalse(status_response.data["enabled"])
        self.assertTrue(MFAConfiguration.objects.filter(user=self.user).exists())
        self.assertFalse(MFAConfiguration.objects.filter(user=other).exists())
