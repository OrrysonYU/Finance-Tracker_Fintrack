from .base import *  # noqa: F403


DEBUG = False
SECRET_KEY = "django-insecure-test-only-key-for-fintrack-suite"
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

# Keep unrelated tests independent; the dedicated auth throttling regression
# test exercises the production limits explicitly.
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_THROTTLE_RATES": {
        **REST_FRAMEWORK["DEFAULT_THROTTLE_RATES"],
        "auth_login": "10/minute",
        "auth_register": "10000/minute",
        "auth_refresh": "10000/minute",
        "auth_password_reset": "10000/minute",
        "auth_mfa": "10000/minute",
    },
}
