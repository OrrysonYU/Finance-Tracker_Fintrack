from django.utils import timezone as django_timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import RevokedToken, UserSession
from .tokens import auth_epoch_claim


class RevocableJWTAuthentication(JWTAuthentication):
    """JWT authentication with server-side logout and password-reset revocation."""

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None:
            return None
        user, token = result
        jti = token.get("jti")
        if jti and RevokedToken.objects.filter(
            jti=jti, expires_at__gt=django_timezone.now()
        ).exists():
            raise AuthenticationFailed("Authentication credentials were invalid.", code="token_revoked")

        if user.auth_epoch:
            if token.get("auth_epoch") != auth_epoch_claim(user):
                raise AuthenticationFailed("Authentication credentials were invalid.", code="token_invalidated")
        session_id = token.get("sid")
        if not session_id:
            raise AuthenticationFailed("Authentication credentials were invalid.", code="session_invalid")
        session = UserSession.objects.filter(pk=session_id, user=user, revoked_at__isnull=True).first()
        if not session:
            raise AuthenticationFailed("Authentication credentials were invalid.", code="session_revoked")
        session.last_activity_at = django_timezone.now()
        session.save(update_fields=("last_activity_at",))
        return user, token
