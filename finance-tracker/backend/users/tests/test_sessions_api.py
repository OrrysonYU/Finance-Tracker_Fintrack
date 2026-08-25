from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import AuthenticationActivity, UserSession


class SessionManagementApiTest(APITestCase):
    password = "StrongPass123!"

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="session-owner", email="session-owner@example.com", password=self.password
        )
        self.other = get_user_model().objects.create_user(
            username="session-other", email="session-other@example.com", password=self.password
        )

    def login(self, username=None):
        response = self.client.post(
            "/api/auth/token/",
            {"username": username or self.user.username, "password": self.password},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        return response.data

    def authenticate(self, access):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    def test_sessions_are_created_listed_and_current_is_identified(self):
        first = self.login()
        second = self.login()
        self.authenticate(first["access"])
        response = self.client.get("/api/auth/sessions/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["sessions"]), 2)
        self.assertEqual(sum(item["current"] for item in response.data["sessions"]), 1)
        self.assertNotIn("token", response.data)
        self.assertNotIn("ip", response.data)
        self.assertNotEqual(first["access"], second["access"])

    def test_cross_user_session_isolation_and_revoke_ownership(self):
        owner_login = self.login()
        other_login = self.login(self.other.username)
        self.authenticate(owner_login["access"])
        other_session = UserSession.objects.get(user=self.other)
        self.assertEqual(self.client.delete(f"/api/auth/sessions/{other_session.id}/").status_code, status.HTTP_404_NOT_FOUND)
        activity = self.client.get("/api/auth/activity/")
        self.assertEqual(activity.status_code, status.HTTP_200_OK)
        self.assertEqual(len(activity.data["activity"]), AuthenticationActivity.objects.filter(user=self.user).count())
        self.assertNotEqual(len(activity.data["activity"]), AuthenticationActivity.objects.count())
        self.assertNotEqual(owner_login["access"], other_login["access"])

    def test_individual_revoke_blocks_access_and_refresh_but_preserves_other_session(self):
        first = self.login()
        second = self.login()
        self.authenticate(first["access"])
        # The opaque session id is intentionally not returned as a client secret; select the non-current session.
        sessions = self.client.get("/api/auth/sessions/").data["sessions"]
        target = next(item for item in sessions if not item["current"])
        revoked = self.client.delete(f"/api/auth/sessions/{target['id']}/")
        self.assertEqual(revoked.status_code, status.HTTP_204_NO_CONTENT)
        self.authenticate(second["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/token/refresh/", {"refresh": second["refresh"]}, format="json").status_code, status.HTTP_401_UNAUTHORIZED)
        self.authenticate(first["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_200_OK)

    def test_logout_other_devices_preserves_current_and_revokes_others(self):
        first = self.login()
        second = self.login()
        self.authenticate(first["access"])
        response = self.client.post("/api/auth/sessions/revoke-others/", {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["revoked_count"], 1)
        active = self.client.get("/api/auth/sessions/").data["sessions"]
        self.assertEqual(len(active), 1)
        self.assertTrue(active[0]["current"])
        self.authenticate(second["access"])
        self.assertEqual(self.client.get("/api/auth/me/").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_activity_is_sanitized_and_bounded_to_user(self):
        login = self.login()
        self.authenticate(login["access"])
        response = self.client.get("/api/auth/activity/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["activity"])
        for event in response.data["activity"]:
            self.assertNotIn("password", event)
            self.assertNotIn("refresh", event)
            self.assertNotIn("access", event)
            self.assertNotIn("authorization", event)
            self.assertNotIn("network_prefix", event)
