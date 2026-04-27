from .base import *  # noqa: F403


DEBUG = False
SECRET_KEY = "django-insecure-test-only-key"
ALLOWED_HOSTS = ["testserver", "127.0.0.1", "localhost"]
CORS_ALLOW_ALL_ORIGINS = True
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
