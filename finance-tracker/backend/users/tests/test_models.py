from django.conf import settings
from django.contrib import admin
from django.contrib.auth import get_user_model
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
