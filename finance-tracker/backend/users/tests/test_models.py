from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import SimpleTestCase, TestCase


class SettingsSmokeTest(SimpleTestCase):
    def test_test_settings_module_uses_split_config(self):
        self.assertFalse(settings.DEBUG)
        self.assertEqual(settings.ROOT_URLCONF, "config.urls")


class CustomUserModelTest(TestCase):
    def test_project_uses_custom_user_model(self):
        self.assertEqual(settings.AUTH_USER_MODEL, "users.User")
        self.assertEqual(get_user_model()._meta.label, "users.User")
        self.assertTrue(admin.site.is_registered(get_user_model()))

    def test_user_preferences_have_defaults_and_can_be_updated(self):
        user = get_user_model().objects.create_user(
            username="fintrack-user",
            email="fintrack@example.com",
            password="safe-test-password",
        )

        self.assertEqual(user.default_currency, "KES")
        self.assertEqual(user.locale, "en-KE")
        self.assertEqual(user.timezone, "Africa/Nairobi")
        self.assertTrue(user.ai_personalization_enabled)
        self.assertTrue(user.notification_budget_updates)
        self.assertTrue(user.notification_goal_updates)
        self.assertTrue(user.notification_account_activity)

        user.default_currency = "USD"
        user.locale = "en-US"
        user.ai_personalization_enabled = False
        user.save(
            update_fields=[
                "default_currency",
                "locale",
                "ai_personalization_enabled",
            ]
        )
        user.refresh_from_db()

        self.assertEqual(user.default_currency, "USD")
        self.assertEqual(user.locale, "en-US")
        self.assertFalse(user.ai_personalization_enabled)

    def test_username_canonical_key_is_database_unique(self):
        User = get_user_model()
        first = User.objects.create_user(username="Case.User", password="safe-test-password")
        self.assertEqual(first.username, "case.user")
        self.assertEqual(first.username_canonical, "case.user")

        with self.assertRaises(IntegrityError), transaction.atomic():
            User.objects.bulk_create([
                User(username="legacy-case-user", username_canonical="case.user")
            ])

    def test_username_change_updates_canonical_key_with_update_fields(self):
        user = get_user_model().objects.create_user(username="before-name", password="safe-test-password")
        user.username = "After.Name"
        user.save(update_fields=["username"])
        user.refresh_from_db()
        self.assertEqual(user.username, "after.name")
        self.assertEqual(user.username_canonical, "after.name")
