from django.conf import settings
from django.test import SimpleTestCase


class SettingsSmokeTest(SimpleTestCase):
    def test_test_settings_module_uses_split_config(self):
        self.assertFalse(settings.DEBUG)
        self.assertEqual(settings.ROOT_URLCONF, "config.urls")
