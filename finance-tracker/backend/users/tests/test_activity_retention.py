from concurrent.futures import ThreadPoolExecutor

from django.contrib.auth import get_user_model
from django.test import TransactionTestCase
from rest_framework import status
from rest_framework.test import APITestCase

from users.models import AuthenticationActivity
from users.session_services import (
    LOGIN_FAILURE_ACTIVITY_LIMIT,
    SECURITY_ACTIVITY_LIMIT,
    prune_activity,
    record_activity,
)


class ActivityRetentionTest(APITestCase):
    password = "StrongPass123!"

    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="activity-owner", email="activity-owner@example.com", password=self.password
        )
        self.other = get_user_model().objects.create_user(
            username="activity-other", email="activity-other@example.com", password=self.password
        )

    def test_security_events_keep_the_existing_bound(self):
        for _ in range(SECURITY_ACTIVITY_LIMIT + 10):
            record_activity(self.user, "logout")

        self.assertEqual(
            AuthenticationActivity.objects.filter(user=self.user, event_type="logout").count(),
            SECURITY_ACTIVITY_LIMIT,
        )

    def test_login_failure_flood_cannot_evict_security_history(self):
        record_activity(self.user, "login_success")
        record_activity(self.user, "logout")
        record_activity(self.user, "password_reset")

        for _ in range(LOGIN_FAILURE_ACTIVITY_LIMIT + 50):
            record_activity(self.user, "login_failure", success=False)

        self.assertEqual(
            AuthenticationActivity.objects.filter(user=self.user, event_type="login_failure").count(),
            LOGIN_FAILURE_ACTIVITY_LIMIT,
        )
        self.assertSetEqual(
            set(
                AuthenticationActivity.objects.filter(user=self.user)
                .exclude(event_type="login_failure")
                .values_list("event_type", flat=True)
            ),
            {"login_success", "logout", "password_reset"},
        )

    def test_legacy_global_pruning_would_evict_security_events_but_category_pruning_does_not(self):
        meaningful = [
            AuthenticationActivity.objects.create(user=self.user, event_type=event_type)
            for event_type in ("login_success", "logout", "password_reset")
        ]
        AuthenticationActivity.objects.bulk_create(
            [
                AuthenticationActivity(user=self.user, event_type="login_failure", success=False)
                for _ in range(SECURITY_ACTIVITY_LIMIT)
            ]
        )

        legacy_eviction_ids = set(
            AuthenticationActivity.objects.filter(user=self.user)
            .order_by("-occurred_at", "-id")
            .values_list("id", flat=True)[SECURITY_ACTIVITY_LIMIT:]
        )
        self.assertTrue({event.id for event in meaningful}.issubset(legacy_eviction_ids))

        prune_activity(self.user)

        self.assertEqual(
            AuthenticationActivity.objects.filter(id__in=[event.id for event in meaningful]).count(),
            len(meaningful),
        )
        self.assertEqual(
            AuthenticationActivity.objects.filter(user=self.user, event_type="login_failure").count(),
            LOGIN_FAILURE_ACTIVITY_LIMIT,
        )

    def test_failure_quota_is_scoped_to_the_user(self):
        record_activity(self.user, "login_success")
        record_activity(self.other, "login_success")
        for _ in range(LOGIN_FAILURE_ACTIVITY_LIMIT + 20):
            record_activity(self.user, "login_failure", success=False)

        self.assertTrue(
            AuthenticationActivity.objects.filter(user=self.user, event_type="login_success").exists()
        )
        self.assertTrue(
            AuthenticationActivity.objects.filter(user=self.other, event_type="login_success").exists()
        )
        self.assertEqual(
            AuthenticationActivity.objects.filter(user=self.other).count(),
            1,
        )

    def test_activity_api_returns_both_bounded_categories_without_secrets(self):
        record_activity(self.user, "password_reset")
        for _ in range(LOGIN_FAILURE_ACTIVITY_LIMIT + 10):
            record_activity(self.user, "login_failure", success=False)
        self.client.force_authenticate(user=self.user)

        response = self.client.get("/api/auth/activity/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["activity"]), LOGIN_FAILURE_ACTIVITY_LIMIT + 1)
        self.assertIn("password_reset", {item["event_type"] for item in response.data["activity"]})
        for item in response.data["activity"]:
            self.assertNotIn("password", item)
            self.assertNotIn("access", item)
            self.assertNotIn("refresh", item)
            self.assertNotIn("authorization", item)
            self.assertNotIn("network_prefix", item)


class ConcurrentActivityRetentionTest(TransactionTestCase):
    reset_sequences = True

    def test_concurrent_writes_do_not_exceed_failure_quota(self):
        user = get_user_model().objects.create_user(
            username="concurrent-owner", email="concurrent-owner@example.com", password="StrongPass123!"
        )

        def write_failure(_):
            record_activity(user, "login_failure", success=False)

        # The service locks the user row before inserting and pruning.  This
        # exercises the same transaction boundary used by live login requests.
        with ThreadPoolExecutor(max_workers=4) as executor:
            list(executor.map(write_failure, range(LOGIN_FAILURE_ACTIVITY_LIMIT + 8)))

        self.assertLessEqual(
            AuthenticationActivity.objects.filter(user=user, event_type="login_failure").count(),
            LOGIN_FAILURE_ACTIVITY_LIMIT,
        )
