from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core import mail
from django.core import signing
from django.core.cache import cache
from django.contrib.auth.tokens import default_token_generator
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import AccessToken


class AuthApiTest(APITestCase):
    register_url = "/api/auth/register/"
    token_url = "/api/auth/token/"
    refresh_url = "/api/auth/token/refresh/"
    me_url = "/api/auth/me/"

    def test_user_can_register_login_refresh_and_fetch_me(self):
        register_response = self.client.post(
            self.register_url,
            {
                "username": "newuser",
                "email": "newuser@example.com",
                "password": "StrongPass123!",
                "password_confirm": "StrongPass123!",
                "default_currency": "usd",
                "locale": "en-US",
            },
            format="json",
        )

        self.assertEqual(register_response.status_code, status.HTTP_201_CREATED)
        self.assertIn("access", register_response.data)
        self.assertIn("refresh", register_response.data)
        self.assertEqual(register_response.data["user"]["username"], "newuser")
        self.assertEqual(register_response.data["user"]["default_currency"], "USD")
        self.assertNotIn("password", register_response.data)

        login_response = self.client.post(
            self.token_url,
            {"username": "newuser", "password": "StrongPass123!"},
            format="json",
        )

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", login_response.data)
        self.assertIn("refresh", login_response.data)
        self.assertEqual(login_response.data["user"]["email"], "newuser@example.com")

        access = login_response.data["access"]
        refresh = login_response.data["refresh"]

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        me_response = self.client.get(self.me_url)

        self.assertEqual(me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.data["username"], "newuser")
        self.assertEqual(me_response.data["locale"], "en-US")

        refresh_response = self.client.post(
            self.refresh_url,
            {"refresh": refresh},
            format="json",
        )

        self.assertEqual(refresh_response.status_code, status.HTTP_200_OK)
        self.assertIn("access", refresh_response.data)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh_response.data['access']}")
        retried_me_response = self.client.get(self.me_url)

        self.assertEqual(retried_me_response.status_code, status.HTTP_200_OK)
        self.assertEqual(retried_me_response.data["username"], "newuser")

    def test_registration_rejects_duplicate_username_and_email(self):
        get_user_model().objects.create_user(
            username="existing",
            email="existing@example.com",
            password="StrongPass123!",
        )

        username_response = self.client.post(
            self.register_url,
            {
                "username": "Existing",
                "email": "other@example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )
        email_response = self.client.post(
            self.register_url,
            {
                "username": "other",
                "email": "Existing@Example.com",
                "password": "StrongPass123!",
            },
            format="json",
        )

        self.assertEqual(username_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(email_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", username_response.data)
        self.assertIn("email", email_response.data)

    def test_username_policy_and_canonical_login(self):
        invalid = [
            ("root", "This username is reserved."),
            ("ADMIN", "This username is reserved."),
            ("admin-user", "This username is reserved."),
            ("administrator", "This username is reserved."),
            ("s.y.s.t.e.m", "This username is reserved."),
            ("a", "Username is too short."),
            ("a" * 31, "Username is too long."),
            ("has space", "Username cannot contain spaces."),
            ("name!", "Username contains unsupported characters."),
            ("аdmin", "This username is reserved."),
        ]
        for username, message in invalid:
            response = self.client.post(
                self.register_url,
                {"username": username, "email": f"{len(username)}@example.com", "password": "StrongPass123!"},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn(message, str(response.data["username"]))

        response = self.client.post(
            self.register_url,
            {"username": "  Case_User  ", "email": "case@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["user"]["username"], "case_user")
        login = self.client.post(self.token_url, {"username": " CASE_USER ", "password": "StrongPass123!"}, format="json")
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        duplicate = self.client.post(
            self.register_url,
            {"username": "CASE_USER", "email": "duplicate@example.com", "password": "StrongPass123!"},
            format="json",
        )
        self.assertEqual(duplicate.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Username is already taken.", str(duplicate.data["username"]))

    def test_display_name_accepts_unicode_and_emoji_independently(self):
        user = get_user_model().objects.create_user(username="display-user", email="display@example.com", password="StrongPass123!")
        self.client.force_authenticate(user=user)
        response = self.client.patch(self.me_url, {"display_name": "José Otuma ✨ 李明"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["display_name"], "José Otuma ✨ 李明")

    def test_registration_rejects_password_mismatch(self):
        response = self.client.post(
            self.register_url,
            {
                "username": "mismatch",
                "email": "mismatch@example.com",
                "password": "StrongPass123!",
                "password_confirm": "DifferentPass123!",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("password_confirm", response.data)

    def test_login_rejects_invalid_credentials(self):
        get_user_model().objects.create_user(
            username="login-user",
            email="login@example.com",
            password="StrongPass123!",
        )

        response = self.client.post(
            self.token_url,
            {"username": "login-user", "password": "wrong-password"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_repeated_invalid_logins_are_throttled(self):
        cache.clear()
        get_user_model().objects.create_user(
            username="throttle-user",
            email="throttle@example.com",
            password="StrongPass123!",
        )
        for _ in range(10):
            response = self.client.post(
                self.token_url,
                {"username": "throttle-user", "password": "wrong-password"},
                format="json",
            )
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        response = self.client.post(
            self.token_url,
            {"username": "throttle-user", "password": "wrong-password"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    def test_refresh_rotation_and_logout_revoke_credentials(self):
        user = get_user_model().objects.create_user(
            username="logout-user",
            email="logout@example.com",
            password="StrongPass123!",
        )
        login = self.client.post(
            self.token_url,
            {"username": user.username, "password": "StrongPass123!"},
            format="json",
        )
        access, refresh = login.data["access"], login.data["refresh"]

        rotated = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(rotated.status_code, status.HTTP_200_OK)
        replay = self.client.post(self.refresh_url, {"refresh": refresh}, format="json")
        self.assertEqual(replay.status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
        logout = self.client.post("/api/auth/logout/", {"refresh": rotated.data["refresh"]}, format="json")
        self.assertEqual(logout.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(self.client.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(
            self.client.post(self.refresh_url, {"refresh": rotated.data["refresh"]}, format="json").status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_password_reset_is_enumeration_safe_single_use_and_revokes_tokens(self):
        user = get_user_model().objects.create_user(
            username="reset-user",
            email="reset@example.com",
            password="StrongPass123!",
        )
        responses = [
            self.client.post("/api/auth/password-reset/", {"email": email}, format="json")
            for email in ("reset@example.com", "missing@example.com")
        ]
        self.assertEqual(responses[0].status_code, status.HTTP_200_OK)
        self.assertEqual(responses[1].status_code, status.HTTP_200_OK)
        self.assertEqual(responses[0].data, responses[1].data)
        self.assertEqual(len(mail.outbox), 1)

        uid = signing.dumps({"user_id": user.pk}, salt="fintrack-password-reset")
        token = default_token_generator.make_token(user)
        payload = {
            "uid": uid,
            "token": token,
            "password": "NewStrongPass123!",
            "password_confirm": "NewStrongPass123!",
        }
        reset = self.client.post("/api/auth/password-reset/confirm/", payload, format="json")
        self.assertEqual(reset.status_code, status.HTTP_200_OK, reset.data)
        user.refresh_from_db()
        self.assertTrue(user.check_password("NewStrongPass123!"))
        reused = self.client.post("/api/auth/password-reset/confirm/", payload, format="json")
        self.assertEqual(reused.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cross_user_data_remains_denied(self):
        owner = get_user_model().objects.create_user(
            username="owner-authz", email="owner-authz@example.com", password="StrongPass123!"
        )
        other = get_user_model().objects.create_user(
            username="other-authz", email="other-authz@example.com", password="StrongPass123!"
        )
        self.client.force_authenticate(user=owner)
        response = self.client.get(self.me_url)
        self.assertEqual(response.data["id"], owner.id)
        self.assertNotEqual(response.data["id"], other.id)

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_expired_and_malformed_access_tokens_are_rejected(self):
        user = get_user_model().objects.create_user(
            username="token-user", email="token@example.com", password="StrongPass123!"
        )
        expired = AccessToken.for_user(user)
        expired.set_exp(lifetime=timedelta(seconds=-1))

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {expired}")
        self.assertEqual(self.client.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)

        self.client.credentials(HTTP_AUTHORIZATION="Bearer malformed.token.value")
        self.assertEqual(self.client.get(self.me_url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_invalid_refresh_token_is_rejected(self):
        response = self.client.post(self.refresh_url, {"refresh": "malformed"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_authenticated_user_can_update_account_center_details(self):
        user = get_user_model().objects.create_user(
            username="account-owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=user)

        response = self.client.patch(
            self.me_url,
            {
                "first_name": "Amina",
                "last_name": "Otieno",
                "display_name": "Amina O.",
                "username": "amina-fintrack",
                "email": "AMINA@example.com",
                "phone_number": "+254 712 345 678",
                "country": "Kenya",
                "timezone": "Africa/Nairobi",
                "default_currency": "kes",
                "locale": "en-KE",
                "notification_budget_updates": False,
                "notification_goal_updates": True,
                "notification_account_activity": False,
                "ai_personalization_enabled": False,
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        user.refresh_from_db()
        self.assertEqual(user.display_name, "Amina O.")
        self.assertEqual(user.username, "amina-fintrack")
        self.assertEqual(user.email, "amina@example.com")
        self.assertEqual(user.default_currency, "KES")
        self.assertFalse(user.notification_budget_updates)
        self.assertFalse(user.notification_account_activity)
        self.assertFalse(user.ai_personalization_enabled)

        reloaded = self.client.get(self.me_url)
        self.assertEqual(reloaded.data["display_name"], "Amina O.")
        self.assertEqual(reloaded.data["phone_number"], "+254 712 345 678")
        self.assertEqual(reloaded.data["country"], "Kenya")

    def test_me_update_is_always_scoped_to_authenticated_user(self):
        owner = get_user_model().objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        other = get_user_model().objects.create_user(
            username="other",
            email="other@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=owner)

        response = self.client.patch(
            self.me_url,
            {"id": other.id, "display_name": "Owner profile"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        owner.refresh_from_db()
        other.refresh_from_db()
        self.assertEqual(owner.display_name, "Owner profile")
        self.assertEqual(other.display_name, "")

    def test_me_rejects_duplicate_identity_and_invalid_preferences(self):
        user = get_user_model().objects.create_user(
            username="owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        get_user_model().objects.create_user(
            username="existing",
            email="existing@example.com",
            password="StrongPass123!",
        )
        self.client.force_authenticate(user=user)

        identity_response = self.client.patch(
            self.me_url,
            {"username": "Existing", "email": "EXISTING@example.com"},
            format="json",
        )
        preferences_response = self.client.patch(
            self.me_url,
            {"default_currency": "US", "timezone": "Not/A_Timezone"},
            format="json",
        )

        self.assertEqual(identity_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("username", identity_response.data)
        self.assertIn("email", identity_response.data)
        self.assertEqual(preferences_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("default_currency", preferences_response.data)
        self.assertIn("timezone", preferences_response.data)
