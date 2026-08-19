from datetime import datetime, timezone

from django.utils import timezone as django_timezone
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import RevokedToken


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

        if user.auth_epoch and token.get("iat"):
            issued_at = datetime.fromtimestamp(int(token["iat"]), tz=timezone.utc)
            if issued_at <= user.auth_epoch:
                raise AuthenticationFailed("Authentication credentials were invalid.", code="token_invalidated")
        return user, token
