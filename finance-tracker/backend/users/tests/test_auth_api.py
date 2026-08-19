from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase


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

    def test_me_requires_authentication(self):
        response = self.client.get(self.me_url)

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
