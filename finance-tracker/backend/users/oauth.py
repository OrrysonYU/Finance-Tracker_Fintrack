"""Provider-agnostic OAuth attempt lifecycle and Google OIDC verification."""

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
from django.db import IntegrityError, transaction
from django.utils import timezone

from .models import Identity, OAuthAttempt
from .username import UsernamePolicyError, normalize_username

User = get_user_model()
GOOGLE_ISSUERS = {"https://accounts.google.com", "accounts.google.com"}
SAFE_OAUTH_ERROR = "Google authentication could not be completed. Please try again."


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


def begin_google_attempt(*, user=None, purpose="login"):
    if not _google_configured():
        raise OAuthError("Google sign-in is not available.", "provider_unavailable")
    if purpose not in {"login", "link"} or (purpose == "link") != bool(user):
        raise OAuthError(code="invalid_attempt")

    OAuthAttempt.objects.filter(expires_at__lte=timezone.now() - timedelta(seconds=settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS)).delete()
    state = secrets.token_urlsafe(32)
    nonce = secrets.token_urlsafe(32)
    OAuthAttempt.objects.create(
        state_hash=_digest(state),
        nonce_hash=_digest(nonce),
        provider="google",
        user=user,
        purpose=purpose,
        redirect_uri=settings.GOOGLE_OIDC_REDIRECT_URI,
        expires_at=timezone.now() + timedelta(seconds=settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS),
    )
    metadata = google_metadata()
    query = urlencode(
        {
            "client_id": settings.GOOGLE_OIDC_CLIENT_ID,
            "redirect_uri": settings.GOOGLE_OIDC_REDIRECT_URI,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "nonce": nonce,
            "prompt": "select_account",
        }
    )
    return {"authorization_url": f"{metadata['authorization_endpoint']}?{query}", "expires_in": settings.OAUTH_ATTEMPT_TIMEOUT_SECONDS}


@transaction.atomic
def consume_attempt(state):
    if not isinstance(state, str) or not state or len(state) > 512:
        raise OAuthError(code="invalid_state")
    attempt = OAuthAttempt.objects.select_for_update().filter(state_hash=_digest(state), provider="google").first()
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
            return json.loads(response.read(settings.OAUTH_MAX_RESPONSE_BYTES).decode("utf-8"))
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


def _signing_key(id_token, jwks_uri):
    try:
        return jwt.PyJWKClient(jwks_uri, cache_keys=True, lifespan=300, timeout=settings.OAUTH_HTTP_TIMEOUT_SECONDS).get_signing_key_from_jwt(id_token).key
    except jwt.PyJWTError as exc:
        raise OAuthError() from exc


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


def _new_username(identity):
    candidate = re.sub(r"[^a-z0-9._-]+", "-", identity.email.split("@", 1)[0].casefold()).strip("._-")[:30]
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
def resolve_google_identity(identity, attempt):
    existing = Identity.objects.select_for_update().select_related("user").filter(provider=identity.provider, provider_subject=identity.subject).first()
    now = timezone.now()
    if existing:
        if attempt.purpose == "link" and existing.user_id != attempt.user_id:
            raise OAuthError(code="identity_unavailable")
        existing.last_used_at = now
        existing.email = identity.email
        existing.save(update_fields=("last_used_at", "email"))
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
    if User.objects.filter(email__iexact=identity.email).exists():
        raise OAuthError("For your security, sign in another way and connect Google in Account Center.", "account_link_required")
    user = User.objects.create_user(
        username=_new_username(identity),
        email=identity.email,
        password=None,
        first_name=identity.given_name,
        last_name=identity.family_name,
        display_name=identity.display_name,
    )
    try:
        Identity.objects.create(user=user, provider=identity.provider, provider_subject=identity.subject, email=identity.email, verified_at=now, last_used_at=now)
    except IntegrityError as exc:
        raise OAuthError(code="identity_unavailable") from exc
    return user, True
