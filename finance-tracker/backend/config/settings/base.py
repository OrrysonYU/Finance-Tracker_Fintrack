from datetime import timedelta
from pathlib import Path

from config.env import env, env_bool, env_int, env_list, load_env_file


BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_env_file(BASE_DIR / ".env")


SECRET_KEY = env("DJANGO_SECRET_KEY", "django-insecure-dev-only-change-me")
DEBUG = False
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", [])


INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt.token_blacklist",
    "corsheaders",
    "drf_spectacular",
    "django_filters",
    "users.apps.UsersConfig",
    "finance",
    "budgets",
    "reports",
    "apps.ai_insights.apps.AIInsightsConfig",
]


MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]


ROOT_URLCONF = "config.urls"


TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]


WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


db_engine = env("DJANGO_DB_ENGINE", "django.db.backends.sqlite3")
db_name = env("DJANGO_DB_NAME", "db.sqlite3")

if db_engine == "django.db.backends.sqlite3" and not Path(db_name).is_absolute():
    db_name = BASE_DIR / db_name

DATABASES = {
    "default": {
        "ENGINE": db_engine,
        "NAME": db_name,
    }
}

if db_engine != "django.db.backends.sqlite3":
    DATABASES["default"].update(
        {
            "HOST": env("DJANGO_DB_HOST", ""),
            "PORT": env("DJANGO_DB_PORT", ""),
            "USER": env("DJANGO_DB_USER", ""),
            "PASSWORD": env("DJANGO_DB_PASSWORD", ""),
        }
    )


AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]


LANGUAGE_CODE = "en-us"
TIME_ZONE = env("DJANGO_TIME_ZONE", "UTC")
USE_I18N = True
USE_TZ = True


STATIC_URL = "static/"
MEDIA_ROOT = Path(env("DJANGO_MEDIA_ROOT", BASE_DIR / "media"))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "users.User"
AUTHENTICATION_BACKENDS = ("users.backends.CanonicalUsernameBackend",)


REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "users.authentication.RevocableJWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/minute",
        "user": "300/minute",
        "auth_login": env("AUTH_LOGIN_RATE", "10/minute"),
        "auth_register": env("AUTH_REGISTER_RATE", "5/hour"),
        "auth_refresh": env("AUTH_REFRESH_RATE", "30/minute"),
        "auth_password_reset": env("AUTH_PASSWORD_RESET_RATE", "5/hour"),
        "auth_mfa": env("AUTH_MFA_RATE", "10/minute"),
        "auth_oauth": env("AUTH_OAUTH_RATE", "10/minute"),
    },
}


CORS_ALLOW_ALL_ORIGINS = env_bool("DJANGO_CORS_ALLOW_ALL_ORIGINS", False)

# Deployment-safe transport defaults. Local settings can opt out explicitly.
SECURE_SSL_REDIRECT = env_bool("DJANGO_SECURE_SSL_REDIRECT", False)
SESSION_COOKIE_SECURE = env_bool("DJANGO_SESSION_COOKIE_SECURE", False)
CSRF_COOKIE_SECURE = env_bool("DJANGO_CSRF_COOKIE_SECURE", False)
SECURE_HSTS_SECONDS = env_int("DJANGO_SECURE_HSTS_SECONDS", 0)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS", False)
SECURE_HSTS_PRELOAD = env_bool("DJANGO_SECURE_HSTS_PRELOAD", False)
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = env("DJANGO_SECURE_REFERRER_POLICY", "same-origin")


# AI implementations remain optional and isolated from core finance flows.
AI_INSIGHTS_ENABLED = env_bool("AI_INSIGHTS_ENABLED", False)
AI_INSIGHTS_PROVIDER = env("AI_INSIGHTS_PROVIDER", "placeholder")


SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env_int("JWT_ACCESS_TOKEN_MINUTES", 30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int("JWT_REFRESH_TOKEN_DAYS", 1)),
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    "AUTH_HEADER_TYPES": ("Bearer",),
    "SIGNING_KEY": env("JWT_SIGNING_KEY", SECRET_KEY),
    "ALGORITHM": env("JWT_ALGORITHM", "HS256"),
}

PASSWORD_RESET_TIMEOUT = env_int("PASSWORD_RESET_TIMEOUT_SECONDS", 3600)
MFA_ISSUER = env("MFA_ISSUER", "Fintrack")
MFA_ENCRYPTION_KEY = env("MFA_ENCRYPTION_KEY", "")
MFA_CHALLENGE_TIMEOUT_SECONDS = env_int("MFA_CHALLENGE_TIMEOUT_SECONDS", 300)
MFA_MAX_CHALLENGE_ATTEMPTS = env_int("MFA_MAX_CHALLENGE_ATTEMPTS", 5)
MFA_TOTP_ALLOWED_DRIFT = env_int("MFA_TOTP_ALLOWED_DRIFT", 1)
GOOGLE_OIDC_CLIENT_ID = env("GOOGLE_OIDC_CLIENT_ID", "")
GOOGLE_OIDC_CLIENT_SECRET = env("GOOGLE_OIDC_CLIENT_SECRET", "")
GOOGLE_OIDC_REDIRECT_URI = env("GOOGLE_OIDC_REDIRECT_URI", "")
GOOGLE_OIDC_DISCOVERY_URL = env("GOOGLE_OIDC_DISCOVERY_URL", "https://accounts.google.com/.well-known/openid-configuration")
APPLE_OIDC_CLIENT_ID = env("APPLE_OIDC_CLIENT_ID", "")
APPLE_OIDC_TEAM_ID = env("APPLE_OIDC_TEAM_ID", "")
APPLE_OIDC_KEY_ID = env("APPLE_OIDC_KEY_ID", "")
APPLE_OIDC_PRIVATE_KEY = env("APPLE_OIDC_PRIVATE_KEY", "")
APPLE_OIDC_REDIRECT_URI = env("APPLE_OIDC_REDIRECT_URI", "")
APPLE_OIDC_DISCOVERY_URL = env("APPLE_OIDC_DISCOVERY_URL", "https://appleid.apple.com/.well-known/openid-configuration")
# Apple returns its authorization response as a cross-site form POST, which a static
# SPA cannot read. The backend bridge endpoint redirects to this trusted frontend
# origin; it is never taken from a request parameter.
FRONTEND_BASE_URL = env("FRONTEND_BASE_URL", "")
APPLE_OIDC_CLIENT_SECRET_LIFETIME_SECONDS = env_int("APPLE_OIDC_CLIENT_SECRET_LIFETIME_SECONDS", 15777000)
OAUTH_ATTEMPT_TIMEOUT_SECONDS = env_int("OAUTH_ATTEMPT_TIMEOUT_SECONDS", 300)
OIDC_CLOCK_SKEW_SECONDS = env_int("OIDC_CLOCK_SKEW_SECONDS", 60)
OAUTH_HTTP_TIMEOUT_SECONDS = env_int("OAUTH_HTTP_TIMEOUT_SECONDS", 5)
OAUTH_MAX_RESPONSE_BYTES = env_int("OAUTH_MAX_RESPONSE_BYTES", 1024 * 1024)
