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
