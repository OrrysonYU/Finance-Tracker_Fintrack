import ipaddress
import time
from datetime import timedelta

from django.db import OperationalError, connection, transaction
from django.db.models import F
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import UntypedToken

from .models import AuthenticationActivity, UserSession


RETENTION_DAYS = 180
# Security-critical activity has its own bounded quota.  Login failures are
# unauthenticated, attacker-controllable noise and therefore never consume
# this quota or evict events from it.
SECURITY_ACTIVITY_LIMIT = 100
LOGIN_FAILURE_ACTIVITY_LIMIT = 25
ACTIVITY_RESPONSE_LIMIT = SECURITY_ACTIVITY_LIMIT + LOGIN_FAILURE_ACTIVITY_LIMIT
LOGIN_FAILURE_EVENT = "login_failure"
SQLITE_LOCK_RETRIES = 200
SQLITE_LOCK_RETRY_DELAY_SECONDS = 0.025


def sanitized_client_metadata(request):
    user_agent = (request.META.get("HTTP_USER_AGENT") or "")[:512]
    lowered = user_agent.lower()
    if "edg/" in lowered or "edge/" in lowered:
        browser = "Edge"
    elif "opr/" in lowered or "opera" in lowered:
        browser = "Opera"
    elif "chrome/" in lowered or "crios/" in lowered:
        browser = "Chrome"
    elif "firefox/" in lowered or "fxios/" in lowered:
        browser = "Firefox"
    elif "safari/" in lowered and "chrome/" not in lowered:
        browser = "Safari"
    else:
        browser = "Unknown"

    if "windows" in lowered:
        operating_system = "Windows"
    elif "android" in lowered:
        operating_system = "Android"
    elif "iphone" in lowered or "ipad" in lowered or "ios" in lowered:
        operating_system = "iOS"
    elif "mac os" in lowered or "macintosh" in lowered:
        operating_system = "macOS"
    elif "linux" in lowered:
        operating_system = "Linux"
    else:
        operating_system = "Unknown"

    if any(marker in lowered for marker in ("iphone", "ipad", "android", "mobile")):
        device_type = "Mobile"
    elif "tablet" in lowered:
        device_type = "Tablet"
    else:
        device_type = "Desktop"

    raw_ip = request.META.get("REMOTE_ADDR", "")
    try:
        parsed = ipaddress.ip_address(raw_ip)
        if parsed.version == 4:
            network_prefix = str(ipaddress.ip_network(f"{parsed}/24", strict=False))
        else:
            network_prefix = str(ipaddress.ip_network(f"{parsed}/48", strict=False))
    except ValueError:
        network_prefix = ""
    return {
        "browser_family": browser,
        "operating_system": operating_system,
        "device_type": device_type,
        "network_prefix": network_prefix,
    }


def _prune_activity_locked(user):
    cutoff = timezone.now() - timedelta(days=RETENTION_DAYS)
    AuthenticationActivity.objects.filter(user=user, occurred_at__lt=cutoff).delete()

    # Keep independent quotas.  In particular, failures can only evict older
    # failures; they can never displace authenticated/security history.
    for event_type, limit in (
        (LOGIN_FAILURE_EVENT, LOGIN_FAILURE_ACTIVITY_LIMIT),
        (None, SECURITY_ACTIVITY_LIMIT),
    ):
        queryset = AuthenticationActivity.objects.filter(user=user)
        if event_type is None:
            queryset = queryset.exclude(event_type=LOGIN_FAILURE_EVENT)
        else:
            queryset = queryset.filter(event_type=event_type)
        ids = list(queryset.order_by("-occurred_at", "-id").values_list("id", flat=True)[limit:])
        if ids:
            AuthenticationActivity.objects.filter(user=user, id__in=ids).delete()


def _lock_activity_owner(user):
    manager = type(user).objects
    if connection.vendor == "sqlite":
        # SQLite has no row-level SELECT FOR UPDATE.  A no-op UPDATE obtains
        # its database write lock before the activity insert/prune sequence.
        manager.filter(pk=user.pk).update(username_canonical=F("username_canonical"))
    return manager.select_for_update().get(pk=user.pk)


def _run_with_activity_lock(user, operation):
    attempts = SQLITE_LOCK_RETRIES if connection.vendor == "sqlite" else 1
    for attempt in range(attempts):
        try:
            with transaction.atomic():
                return operation(_lock_activity_owner(user))
        except OperationalError as exc:
            is_retryable = connection.vendor == "sqlite" and "locked" in str(exc).lower()
            if not is_retryable or attempt == attempts - 1:
                raise
            time.sleep(SQLITE_LOCK_RETRY_DELAY_SECONDS)


def prune_activity(user):
    """Apply age and per-category limits while serializing writes per user."""
    return _run_with_activity_lock(user, _prune_activity_locked)


def record_activity(user, event_type, request=None, session=None, success=True):
    metadata = sanitized_client_metadata(request) if request is not None else {}

    def create_and_prune(locked_user):
        event = AuthenticationActivity.objects.create(
            user=locked_user,
            event_type=event_type,
            success=success,
            session=session,
            **metadata,
        )
        _prune_activity_locked(locked_user)
        return event

    return _run_with_activity_lock(user, create_and_prune)


def create_session(user, request=None, authentication_method="password"):
    metadata = sanitized_client_metadata(request) if request is not None else {}
    return UserSession.objects.create(
        user=user,
        authentication_method=authentication_method,
        **metadata,
    )


def _token_session_id(token):
    try:
        return token.get("sid")
    except AttributeError:
        return None


def blacklist_session_refresh_tokens(session):
    now = timezone.now()
    for outstanding in OutstandingToken.objects.filter(user=session.user, expires_at__gt=now):
        try:
            if _token_session_id(UntypedToken(outstanding.token)) == str(session.id):
                BlacklistedToken.objects.get_or_create(token=outstanding)
        except Exception:
            continue


@transaction.atomic
def revoke_session(session, event=True, request=None):
    locked = UserSession.objects.select_for_update().get(pk=session.pk)
    if locked.revoked_at is None:
        locked.revoked_at = timezone.now()
        locked.save(update_fields=("revoked_at",))
        blacklist_session_refresh_tokens(locked)
        if event:
            record_activity(locked.user, "session_revoked", request=request, session=locked)
    return locked


@transaction.atomic
def revoke_other_sessions(user, current_session_id, request=None):
    sessions = list(UserSession.objects.select_for_update().filter(user=user, revoked_at__isnull=True).exclude(pk=current_session_id))
    now = timezone.now()
    for session in sessions:
        session.revoked_at = now
        session.save(update_fields=("revoked_at",))
        blacklist_session_refresh_tokens(session)
        record_activity(user, "session_revoked", request=request, session=session)
    return sessions
