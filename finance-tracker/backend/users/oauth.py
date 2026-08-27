"""Provider-neutral OAuth attempt, identity, and OIDC services."""

import hashlib
import json
import re
import secrets
import time
from dataclasses import dataclass
from datetime import timedelta
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Identity, OAuthAttempt
from .username import UsernamePolicyError, normalize_username

User = get_user_model()
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
APPLE_ISSUER = "https://appleid.apple.com"
# SPA route that finishes the Apple flow. Internal to the frontend bundle, so it is a
# constant rather than a deployment setting; only the origin is configurable.
APPLE_FRONTEND_CALLBACK_PATH = "/oauth/apple/callback"
SAFE_OAUTH_ERROR = "Authentication could not be completed. Please try again."
_JWKS_CACHE = {}
# Apple sends only URL-safe authorization codes, states, and error slugs. Anything
# outside this alphabet is provider noise or injection and never crosses the bridge.
_SAFE_BRIDGE_VALUE = re.compile(r"\A[A-Za-z0-9._~+/=-]{1,2048}\Z")


class OAuthError(Exception):
    """A sanitized OAuth failure suitable for an API response."""

    def __init__(self, message=SAFE_OAUTH_ERROR, code="oauth_failed"):
        self.message = message
        self.code = code
        super().__init__(message)


@dataclass(frozen=True)
class VerifiedIdentity:
    provider: str
    subject: str
    email: str
    display_name: str
    given_name: str
    family_name: str


def _digest(value):
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _google_configured():
    if not (settings.GOOGLE_OIDC_CLIENT_ID and settings.GOOGLE_OIDC_CLIENT_SECRET and settings.GOOGLE_OIDC_REDIRECT_URI):
        return False
    parsed = urlparse(settings.GOOGLE_OIDC_REDIRECT_URI)
    return bool(parsed.scheme in {"http", "https"} and parsed.netloc and (parsed.scheme == "https" or parsed.hostname in {"127.0.0.1", "localhost"}))


def _trusted_origin(value):
    """Return a normalized origin for a server-configured URL, or None if unusable."""
    parsed = urlparse(value or "")
    if parsed.scheme not in {"http", "https"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment:
        return None
    if parsed.scheme != "https" and parsed.hostname not in {"127.0.0.1", "localhost", "::1"}:
        return None
    return f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"


def _apple_configured():
    required = (
        settings.APPLE_OIDC_CLIENT_ID,
        settings.APPLE_OIDC_TEAM_ID,
        settings.APPLE_OIDC_KEY_ID,
        settings.APPLE_OIDC_PRIVATE_KEY,
        settings.APPLE_OIDC_REDIRECT_URI,
    )
    if not all(required):
        return False
    # Apple's form_post response has to land on the backend bridge, which cannot hand the
    # authorization code back to the SPA without a trusted frontend origin. Refuse to start
    # a flow that could not be completed rather than failing after the provider round trip.
    if not _trusted_origin(settings.FRONTEND_BASE_URL):
        return False
    return bool(_trusted_origin(settings.APPLE_OIDC_REDIRECT_URI))


def apple_frontend_callback_url(**params):
    """Build the SPA callback URL from trusted configuration and sanitized provider values."""
    origin = _trusted_origin(settings.FRONTEND_BASE_URL)
    if not origin:
        raise OAuthError("Apple sign-in is not available.", "provider_unavailable")
    safe = {key: value for key, value in params.items() if isinstance(value, str) and _SAFE_BRIDGE_VALUE.match(value)}
    query = f"?{urlencode(safe)}" if safe else ""
    return f"{origin}{APPLE_FRONTEND_CALLBACK_PATH}{query}"


def _begin_attempt(*, provider, client_id, redirect_uri, authorization_endpoint, scope, user=None, purpose="login", extra_params=None):
    if purpose not in {"login", "link"} or (purpose == "link") != bool(user):
        raise OAuthError(code="invalid_attempt")

    OAuthAttempt.objects.filter(expires_at__lte=timezone.now() - timedelta(seconds=settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS)).delete()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    OAuthAttempt.objects.create(
        state_hash=_digest(state),
        nonce_hash=_digest(nonce),
        provider=provider,
        user=user,
        purpose=purpose,
        redirect_uri=redirect_uri,
        expires_at=timezone.now() + timedelta(seconds=settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS),
    )
    query_params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": scope,
            "state": state,
            "nonce": nonce,
        }
    query_params.update(extra_params or {})
    return {"authorization_url": f"{authorization_endpoint}?{urlencode(query_params)}", "expires_in": settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS}


def begin_google_attempt(*, user=None, purpose="login"):
    if not _google_configured():
        raise OAuthError("Google sign-in is not available.", "provider_unavailable")
    metadata = google_metadata()
    return _begin_attempt(
        provider="google",
        client_id=settings.GOOGLE_OIDC_CLIENT_ID,
        redirect_uri=settings.GOOGLE_OIDC_REDIRECT_URI,
        authorization_endpoint=metadata["authorization_endpoint"],
        scope="openid email profile",
        user=user,
        purpose=purpose,
        extra_params={"prompt": "select_account"},
    )


def begin_apple_attempt(*, user=None, purpose="login"):
    if not _apple_configured():
        raise OAuthError("Apple sign-in is not available.", "provider_unavailable")
    metadata = apple_metadata()
    return _begin_attempt(
        provider="apple",
        client_id=settings.APPLE_OIDC_CLIENT_ID,
        redirect_uri=settings.APPLE_OIDC_REDIRECT_URI,
        authorization_endpoint=metadata["authorization_endpoint"],
        # Apple mandates response_mode=form_post whenever the name or email scope is
        # requested, and Fintrack needs the email claim to provision a first-time account.
        # The POST therefore lands on the backend bridge, which forwards the authorization
        # code to the SPA callback route. Apple's optional name payload is still not
        # requested, so no additional scope is involved.
        scope="openid email",
        user=user,
        purpose=purpose,
        extra_params={"response_mode": "form_post"},
    )


@transaction.atomic
def consume_attempt(state, provider="google"):
    if not isinstance(state, str) or not state or len(state) > 512:
        raise OAuthError(code="invalid_state")
    if provider not in {"google", "apple"}:
        raise OAuthError(code="invalid_state")
    attempt = OAuthAttempt.objects.select_for_update().filter(state_hash=_digest(state), provider=provider).first()
    now = timezone.now()
    if not attempt or attempt.used_at or attempt.expires_at <= now:
        raise OAuthError(code="invalid_state")
    attempt.used_at = now
    attempt.save(update_fields=("used_at",))
    return attempt


def _fetch_json(url, *, data=None, headers=None):
    request = Request(url, data=data, headers=headers or {}, method="POST" if data is not None else "GET")
    try:
        with urlopen(request, timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS) as response:
            if response.status != 200:
                raise OAuthError()
            raw = response.read(settings.OAUTH_MAX_RESPONSE_BYTES + 1)
            if len(raw) > settings.OAUTH_MAX_RESPONSE_BYTES:
                raise OAuthError()
            return json.loads(raw.decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, ValueError, UnicodeError, json.JSONDecodeError) as exc:
        raise OAuthError() from exc


def google_metadata():
    metadata = _fetch_json(settings.GOOGLE_OIDC_DISCOVERY_URL)
    if (
        metadata.get("issuer") != "https://accounts.google.com"
        or not str(metadata.get("authorization_endpoint", "")).startswith("https://accounts.google.com/")
        or not str(metadata.get("token_endpoint", "")).startswith("https://oauth2.googleapis.com/")
        or not str(metadata.get("jwks_uri", "")).startswith("https://www.googleapis.com/")
    ):
        raise OAuthError()
    return metadata


def apple_metadata():
    metadata = _fetch_json(settings.APPLE_OIDC_DISCOVERY_URL)
    if (
        metadata.get("issuer") != APPLE_ISSUER
        or metadata.get("authorization_endpoint") != f"{APPLE_ISSUER}/auth/authorize"
        or metadata.get("token_endpoint") != f"{APPLE_ISSUER}/auth/token"
        or metadata.get("jwks_uri") != f"{APPLE_ISSUER}/auth/keys"
    ):
        raise OAuthError()
    return metadata


def _load_jwks(jwks_uri, *, force_refresh=False):
    cached = _JWKS_CACHE.get(jwks_uri)
    if not force_refresh and cached and cached[0] > time.monotonic():
        return cached[1]
    document = _fetch_json(jwks_uri)
    if not isinstance(document, dict) or not isinstance(document.get("keys"), list):
        raise OAuthError()
    _JWKS_CACHE[jwks_uri] = (time.monotonic() + 300, document)
    return document


def _signing_key(id_token, jwks_uri):
    try:
        header = jwt.get_unverified_header(id_token)
        if header.get("alg") != "RS256" or not isinstance(header.get("kid"), str):
            raise OAuthError()
        for force_refresh in (False, True):
            jwks = _load_jwks(jwks_uri, force_refresh=force_refresh)
            for item in jwks["keys"]:
                if item.get("kid") == header["kid"] and item.get("alg", "RS256") == "RS256":
                    return jwt.PyJWK(item, algorithm="RS256").key
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise OAuthError() from exc
    raise OAuthError()


def verify_google_code(code, attempt):
    if not isinstance(code, str) or not code or len(code) > 2048:
        raise OAuthError(code="invalid_code")
    metadata = google_metadata()
    body = urlencode(
        {
            "code": code,
            "client_id": settings.GOOGLE_OIDC_CLIENT_ID,
            "client_secret": settings.GOOGLE_OIDC_CLIENT_SECRET,
            "redirect_uri": attempt.redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("ascii")
    tokens = _fetch_json(metadata["token_endpoint"], data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    id_token = tokens.get("id_token")
    if not isinstance(id_token, str):
        raise OAuthError()
    try:
        claims = jwt.decode(
            id_token,
            _signing_key(id_token, metadata["jwks_uri"]),
            algorithms=["RS256"],
            audience=settings.GOOGLE_OIDC_CLIENT_ID,
            leeway=settings.OIDC_CLOCK_SKEW_SECONDS,
            options={"require": ["iss", "sub", "aud", "exp", "iat", "nonce"]},
        )
    except jwt.PyJWTError as exc:
        raise OAuthError() from exc
    if claims.get("iss") not in GOOGLE_ISSUERS or not secrets.compare_digest(_digest(str(claims.get("nonce", ""))), attempt.nonce_hash):
        raise OAuthError()
    issued_at = claims.get("iat")
    if not isinstance(issued_at, (int, float)) or issued_at > time.time() + settings.OIDC_CLOCK_SKEW_SECONDS:
        raise OAuthError()
    audience = claims.get("aud")
    if isinstance(audience, list) and len(audience) > 1 and claims.get("azp") != settings.GOOGLE_OIDC_CLIENT_ID:
        raise OAuthError()
    if claims.get("email_verified") is not True or not claims.get("email"):
        raise OAuthError("A verified Google email is required.", "email_not_verified")
    return VerifiedIdentity(
        provider="google",
        subject=str(claims["sub"]),
        email=str(claims["email"]).strip().lower(),
        display_name=str(claims.get("name", ""))[:150],
        given_name=str(claims.get("given_name", ""))[:150],
        family_name=str(claims.get("family_name", ""))[:150],
    )


def _apple_client_secret():
    now = int(time.time())
    private_key = settings.APPLE_OIDC_PRIVATE_KEY.replace("\\n", "\n")
    try:
        return jwt.encode(
            {
                "iss": settings.APPLE_OIDC_TEAM_ID,
                "iat": now,
                "exp": now + min(settings.APPLE_OIDC_CLIENT_SECRET_LIFETIME_SECONDS, 15777000),
                "aud": APPLE_ISSUER,
                "sub": settings.APPLE_OIDC_CLIENT_ID,
            },
            private_key,
            algorithm="ES256",
            headers={"kid": settings.APPLE_OIDC_KEY_ID},
        )
    except (jwt.PyJWTError, ValueError, TypeError) as exc:
        raise OAuthError("Apple sign-in is not available.", "provider_unavailable") from exc


def _verified_email(claims, provider):
    email = claims.get("email")
    verified = claims.get("email_verified")
    if email is None:
        return ""
    if not isinstance(email, str) or verified not in {True, "true"}:
        raise OAuthError(f"A verified {provider.title()} email is required.", "email_not_verified")
    normalized = email.strip().lower()
    try:
        validate_email(normalized)
    except ValidationError as exc:
        raise OAuthError(f"A verified {provider.title()} email is required.", "email_not_verified") from exc
    return normalized


def verify_apple_code(code, attempt):
    if not isinstance(code, str) or not code or len(code) > 2048:
        raise OAuthError(code="invalid_code")
    metadata = apple_metadata()
    body = urlencode(
        {
            "code": code,
            "client_id": settings.APPLE_OIDC_CLIENT_ID,
            "client_secret": _apple_client_secret(),
            "redirect_uri": attempt.redirect_uri,
            "grant_type": "authorization_code",
        }
    ).encode("ascii")
    tokens = _fetch_json(metadata["token_endpoint"], data=body, headers={"Content-Type": "application/x-www-form-urlencoded"})
    id_token = tokens.get("id_token")
    if not isinstance(id_token, str):
        raise OAuthError()
    try:
        claims = jwt.decode(
            id_token,
            _signing_key(id_token, metadata["jwks_uri"]),
            algorithms=["RS256"],
            audience=settings.APPLE_OIDC_CLIENT_ID,
            issuer=APPLE_ISSUER,
            leeway=settings.OIDC_CLOCK_SKEW_SECONDS,
            options={"require": ["iss", "sub", "aud", "exp", "iat", "nonce"]},
        )
    except jwt.PyJWTError as exc:
        raise OAuthError() from exc
    subject = claims.get("sub")
    issued_at = claims.get("iat")
    if not isinstance(subject, str) or not subject or len(subject) > 255:
        raise OAuthError()
    if not isinstance(issued_at, (int, float)) or issued_at > time.time() + settings.OIDC_CLOCK_SKEW_SECONDS:
        raise OAuthError()
    if not secrets.compare_digest(_digest(str(claims.get("nonce", ""))), attempt.nonce_hash):
        raise OAuthError()
    return VerifiedIdentity(
        provider="apple",
        subject=subject,
        email=_verified_email(claims, "apple"),
        display_name="",
        given_name="",
        family_name="",
    )


def _new_username(identity):
    local_part = identity.email.split("@", 1)[0] if identity.email else identity.provider
    candidate = re.sub(r"[^a-z0-9._-]+", "-", local_part.casefold()).strip("._-")[:30]
    try:
        candidate = normalize_username(candidate)
    except UsernamePolicyError:
        candidate = "member"
    if not User.objects.filter(username_canonical=candidate).exists():
        return candidate
    suffix = hashlib.sha256(f"{identity.provider}:{identity.subject}".encode()).hexdigest()[:8]
    base = candidate[: 29 - len(suffix)].rstrip("._-")
    return normalize_username(f"{base}-{suffix}")


def _require_active(user):
    # The password path enforces this through ModelBackend.user_can_authenticate; the
    # provider path must not become a way around a deactivated account.
    if not user.is_active:
        raise OAuthError(code="identity_unavailable")
    return user


@transaction.atomic
def resolve_identity(identity, attempt):
    if identity.provider != attempt.provider or identity.provider not in {"google", "apple"}:
        raise OAuthError(code="invalid_attempt")
    existing = Identity.objects.select_for_update().select_related("user").filter(provider=identity.provider, provider_subject=identity.subject).first()
    now = timezone.now()
    if existing:
        if attempt.purpose == "link" and existing.user_id != attempt.user_id:
            raise OAuthError(code="identity_unavailable")
        existing.last_used_at = now
        update_fields = ["last_used_at"]
        # Apple omits the email claim on every sign-in after the first, so an empty
        # provider email must never overwrite what we already stored. A different
        # non-empty value is a genuine change at the provider and must be recorded.
        if identity.email and identity.email != existing.email:
            existing.email = identity.email
            update_fields.append("email")
        existing.save(update_fields=update_fields)
        return _require_active(existing.user), False
    if attempt.purpose == "link":
        if not attempt.user_id:
            raise OAuthError(code="invalid_attempt")
        _require_active(attempt.user)
        try:
            Identity.objects.create(user=attempt.user, provider=identity.provider, provider_subject=identity.subject, email=identity.email, verified_at=now, last_used_at=now)
        except IntegrityError as exc:
            raise OAuthError(code="identity_unavailable") from exc
        return attempt.user, True
    if not identity.email:
        raise OAuthError(f"A verified {identity.provider.title()} email is required for first sign-in.", "email_required")
    if User.objects.filter(email__iexact=identity.email).exists():
        raise OAuthError(f"For your security, sign in another way and connect {identity.provider.title()} in Account Center.", "account_link_required")
    user = User.objects.create_user(
        username=_new_username(identity),
        email=identity.email,
        password=None,
        first_name=identity.given_name,
        last_name=identity.family_name,
        display_name=identity.display_name,
    )
    try:
        with transaction.atomic():
            Identity.objects.create(user=user, provider=identity.provider, provider_subject=identity.subject, email=identity.email, verified_at=now, last_used_at=now)
    except IntegrityError as exc:
        # A concurrent first login may have won the provider-subject constraint.
        # Discard the losing provisional user and converge on the committed identity.
        existing = Identity.objects.select_for_update().select_related("user").filter(provider=identity.provider, provider_subject=identity.subject).first()
        if existing:
            user.delete()
            existing.last_used_at = now
            existing.save(update_fields=("last_used_at",))
            return _require_active(existing.user), False
        raise OAuthError(code="identity_unavailable") from exc
    return user, True


def resolve_google_identity(identity, attempt):
    return resolve_identity(identity, attempt)


def resolve_apple_identity(identity, attempt):
    return resolve_identity(identity, attempt)
