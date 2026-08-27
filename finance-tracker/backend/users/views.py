import logging
from datetime import datetime, timedelta, timezone as datetime_timezone

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core import signing
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.http import FileResponse
from django.http.response import HttpResponseRedirectBase
from rest_framework import permissions, status
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken, TokenError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.exceptions import ParseError
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from .serializers import (
    LoginSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    UserSerializer,
    MFAChallengeSerializer,
    MFAEnrollmentConfirmSerializer,
    MFAReauthSerializer,
    SecureTokenRefreshSerializer,
)
from .authentication import OptionalRevocableJWTAuthentication
from .mfa import decrypt_secret, generate_challenge_token, provisioning_uri, recovery_hash, verify_totp
from .models import AuthenticationActivity, MFAChallenge, MFAConfiguration, MFAEnrollment, MFARecoveryCode, UserSession
from .models import Identity
from .oauth import (
    OAuthError,
    apple_frontend_callback_url,
    begin_apple_attempt,
    begin_google_attempt,
    consume_attempt,
    resolve_apple_identity,
    resolve_google_identity,
    verify_apple_code,
    verify_google_code,
)
from .services_mfa import begin_enrollment, confirm_enrollment, disable_mfa, replace_recovery_codes, revoke_user_sessions
from .session_services import (
    ACTIVITY_RESPONSE_LIMIT,
    prune_activity,
    record_activity,
    revoke_other_sessions,
    revoke_session,
)
import hashlib
from .tokens import issue_token_pair
from .services import ProfileImageValidationError, delete_profile_image, replace_profile_image
from .throttles import AuthScopedRateThrottle

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_register"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        tokens = issue_token_pair(user, request=request, authentication_method="password")

        return Response(
            {
                "user": UserSerializer(user).data,
                **tokens,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_login"


class GoogleStartView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def get(self, request):
        try:
            response = Response(begin_google_attempt())
            response["Cache-Control"] = "no-store"
            return response
        except OAuthError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_503_SERVICE_UNAVAILABLE if exc.code == "provider_unavailable" else status.HTTP_400_BAD_REQUEST)


class GoogleCallbackView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = [OptionalRevocableJWTAuthentication]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def _no_store(self, response):
        response["Cache-Control"] = "no-store"
        return response

    def _complete(self, request, payload):
        try:
            attempt = consume_attempt(payload.get("state"), "google")
            # A link attempt may only be completed by the account that started it. Without
            # this the callback is CSRF-able: an attacker starts a link on their own account
            # and lures the victim through the authorization URL, binding the victim's Google
            # identity to the attacker's account.
            if attempt.purpose == "link" and (not request.user.is_authenticated or request.user.pk != attempt.user_id):
                raise OAuthError("Sign in again before connecting Google to your account.", "link_not_authorized")
            if payload.get("error"):
                raise OAuthError("Google authentication was cancelled or could not be completed.", "provider_error")
            identity = verify_google_code(payload.get("code"), attempt)
            user, linked = resolve_google_identity(identity, attempt)
            if attempt.purpose == "link":
                return self._no_store(Response({"linked": linked, "provider": "google"}, status=status.HTTP_200_OK))
            if user.mfa_enabled:
                token, token_hash = generate_challenge_token()
                MFAChallenge.objects.create(user=user, token_hash=token_hash, expires_at=timezone.now() + timedelta(seconds=settings.MFA_CHALLENGE_TIMEOUT_SECONDS))
                return self._no_store(Response({"mfa_required": True, "mfa_challenge": token}, status=status.HTTP_200_OK))
            tokens = issue_token_pair(user, request=request, authentication_method="google")
            return self._no_store(Response({**tokens, "user": UserSerializer(user).data}, status=status.HTTP_200_OK))
        except OAuthError as exc:
            return self._no_store(Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST))

    def post(self, request):
        return self._complete(request, request.data)


class IdentityListView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response({"identities": [{"provider": item.provider, "verified": bool(item.verified_at), "verified_at": item.verified_at, "email": item.email} for item in request.user.identities.all()]})


class GoogleLinkStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def post(self, request):
        password = request.data.get("password", "")
        if not password or not request.user.has_usable_password() or not request.user.check_password(password):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.mfa_enabled:
            code = str(request.data.get("code", "")).strip()
            config = MFAConfiguration.objects.filter(user=request.user, confirmed_at__isnull=False).first()
            step = verify_totp(decrypt_secret(config.secret_encrypted), code) if config and code else None
            if step is None or (config.last_used_step is not None and step <= config.last_used_step):
                return Response({"detail": "A fresh MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            config.last_used_step = step
            config.save(update_fields=("last_used_step",))
        try:
            response = Response(begin_google_attempt(user=request.user, purpose="link"))
            response["Cache-Control"] = "no-store"
            return response
        except OAuthError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)


class AppleStartView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def get(self, request):
        try:
            response = Response(begin_apple_attempt())
            response["Cache-Control"] = "no-store"
            return response
        except OAuthError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_503_SERVICE_UNAVAILABLE if exc.code == "provider_unavailable" else status.HTTP_400_BAD_REQUEST)


class AppleCallbackView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = [OptionalRevocableJWTAuthentication]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def post(self, request):
        payload = request.data
        response = None
        try:
            attempt = consume_attempt(payload.get("state"), "apple")
            if attempt.purpose == "link" and (not request.user.is_authenticated or request.user.pk != attempt.user_id):
                raise OAuthError("Sign in again before connecting Apple to your account.", "link_not_authorized")
            if payload.get("error"):
                raise OAuthError("Apple authentication was cancelled or could not be completed.", "provider_error")
            identity = verify_apple_code(payload.get("code"), attempt)
            user, linked = resolve_apple_identity(identity, attempt)
            if attempt.purpose == "link":
                response = Response({"linked": linked, "provider": "apple"}, status=status.HTTP_200_OK)
            elif user.mfa_enabled:
                token, token_hash = generate_challenge_token()
                MFAChallenge.objects.create(user=user, token_hash=token_hash, expires_at=timezone.now() + timedelta(seconds=settings.MFA_CHALLENGE_TIMEOUT_SECONDS))
                response = Response({"mfa_required": True, "mfa_challenge": token}, status=status.HTTP_200_OK)
            else:
                tokens = issue_token_pair(user, request=request, authentication_method="apple")
                response = Response({**tokens, "user": UserSerializer(user).data}, status=status.HTTP_200_OK)
        except OAuthError as exc:
            response = Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)
        response["Cache-Control"] = "no-store"
        return response


class SeeOtherRedirect(HttpResponseRedirectBase):
    """303 redirect. Django ships 301/302/307/308 only, and Apple's POST must become a GET."""

    status_code = 303
    allowed_schemes = ["http", "https"]


class AppleFormCallbackView(APIView):
    """Transport adapter for Apple's cross-site ``response_mode=form_post`` response.

    Apple POSTs the authorization response here because a static SPA cannot read a
    cross-site form POST. The bridge copies only ``state``, ``code`` and ``error``,
    each shape-validated, onto the SPA callback route built from trusted server
    configuration, then answers with a 303 so the browser re-issues a GET.

    No OAuth state is consumed or trusted at this hop. AppleCallbackView remains the
    single authoritative consumer, which keeps single-use state semantics intact and
    keeps the link-ownership check where the browser's Authorization header exists --
    Apple's cross-site POST carries no Fintrack credentials at all.
    """

    permission_classes = [permissions.AllowAny]
    authentication_classes = []
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"
    parser_classes = [FormParser, MultiPartParser]

    def post(self, request):
        try:
            payload = request.data
        except ParseError:
            payload = {}
        forwarded = {key: payload.get(key) for key in ("state", "code", "error")}
        try:
            destination = apple_frontend_callback_url(**{key: value for key, value in forwarded.items() if value})
        except OAuthError as exc:
            response = Response({"detail": exc.message}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
            response["Cache-Control"] = "no-store"
            return response
        response = SeeOtherRedirect(destination)
        response["Cache-Control"] = "no-store"
        response["Referrer-Policy"] = "no-referrer"
        return response


class AppleLinkStartView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_oauth"

    def post(self, request):
        password = request.data.get("password", "")
        if not password or not request.user.has_usable_password() or not request.user.check_password(password):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.mfa_enabled:
            code = str(request.data.get("code", "")).strip()
            config = MFAConfiguration.objects.filter(user=request.user, confirmed_at__isnull=False).first()
            step = verify_totp(decrypt_secret(config.secret_encrypted), code) if config and code else None
            if step is None or (config.last_used_step is not None and step <= config.last_used_step):
                return Response({"detail": "A fresh MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            config.last_used_step = step
            config.save(update_fields=("last_used_step",))
        try:
            response = Response(begin_apple_attempt(user=request.user, purpose="link"))
            response["Cache-Control"] = "no-store"
            return response
        except OAuthError as exc:
            return Response({"detail": exc.message}, status=status.HTTP_400_BAD_REQUEST)


class IdentityUnlinkView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, provider):
        if not request.user.has_usable_password() and request.user.identities.count() <= 1:
            return Response({"detail": "Add a password before disconnecting your only sign-in method."}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get("password", "")
        if not password or not request.user.has_usable_password() or not request.user.check_password(password):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.mfa_enabled:
            code = str(request.data.get("code", "")).strip()
            config = MFAConfiguration.objects.filter(user=request.user, confirmed_at__isnull=False).first()
            step = verify_totp(decrypt_secret(config.secret_encrypted), code) if config and code else None
            if step is None or (config.last_used_step is not None and step <= config.last_used_step):
                return Response({"detail": "A fresh MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            config.last_used_step = step
            config.save(update_fields=("last_used_step",))
        identity = Identity.objects.filter(user=request.user, provider=provider).first()
        if not identity:
            return Response({"detail": "Identity not found."}, status=status.HTTP_404_NOT_FOUND)
        if not request.user.has_usable_password() and request.user.identities.count() <= 1:
            return Response({"detail": "Add a password before disconnecting your only sign-in method."}, status=status.HTTP_400_BAD_REQUEST)
        identity.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MFAChallengeView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_mfa"

    def post(self, request):
        serializer = MFAChallengeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["challenge"]
        challenge_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        with transaction.atomic():
            challenge = MFAChallenge.objects.select_for_update().select_related("user").filter(token_hash=challenge_hash).first()
            generic = Response({"detail": "The MFA code is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
            if not challenge or challenge.used_at or challenge.expires_at <= timezone.now() or challenge.attempts >= settings.MFA_MAX_CHALLENGE_ATTEMPTS:
                return generic
            challenge.attempts += 1
            code = serializer.validated_data["code"]
            config = MFAConfiguration.objects.select_for_update().filter(user=challenge.user, user__mfa_enabled=True).first()
            valid = False
            used_recovery_code = False
            if config:
                secret = decrypt_secret(config.secret_encrypted)
                step = verify_totp(secret, code)
                if step is not None and (config.last_used_step is None or step > config.last_used_step):
                    config.last_used_step = step
                    config.save(update_fields=["last_used_step"])
                    valid = True
            if not valid and config:
                code_obj = MFARecoveryCode.objects.select_for_update().filter(configuration=config, code_hash=recovery_hash(code), used_at__isnull=True).first()
                if code_obj:
                    code_obj.used_at = timezone.now()
                    code_obj.save(update_fields=["used_at"])
                    valid = True
                    used_recovery_code = True
            if not valid:
                challenge.save(update_fields=["attempts"])
                return generic
            challenge.used_at = timezone.now()
            challenge.save(update_fields=["attempts", "used_at"])
            tokens = issue_token_pair(challenge.user, request=request, authentication_method="mfa")
            if used_recovery_code:
                record_activity(challenge.user, "recovery_code_used", request=request)
            return Response({**tokens, "user": UserSerializer(challenge.user).data})


class MFAStatusView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        config = MFAConfiguration.objects.filter(user=request.user, confirmed_at__isnull=False).first()
        return Response({"enabled": bool(request.user.mfa_enabled and config), "recovery_codes_remaining": config.recovery_codes.filter(used_at__isnull=True).count() if config else 0, "enrollment_in_progress": MFAEnrollment.objects.filter(user=request.user).exists()})


class MFAEnrollView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_mfa"

    def post(self, request):
        password = request.data.get("password", "")
        if not password or not request.user.check_password(password):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        if request.user.mfa_enabled:
            return Response({"detail": "MFA is already enabled."}, status=status.HTTP_400_BAD_REQUEST)
        secret = begin_enrollment(request.user)
        return Response({"secret": secret, "provisioning_uri": provisioning_uri(secret, request.user.username), "expires_in": 600})


class MFAEnrollConfirmView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_mfa"

    def post(self, request):
        serializer = MFAEnrollmentConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            enrollment = MFAEnrollment.objects.select_for_update().filter(user=request.user).first()
            if not enrollment or enrollment.created_at + timedelta(minutes=10) <= timezone.now():
                return Response({"detail": "The enrollment request is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
            secret = decrypt_secret(enrollment.secret_encrypted)
            step = verify_totp(secret, serializer.validated_data["code"])
            if step is None:
                return Response({"detail": "The MFA code is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)
            config = confirm_enrollment(request.user, secret, step)
            recovery_codes = replace_recovery_codes(config)
            request.user.refresh_from_db()
            tokens = issue_token_pair(request.user, request=request, authentication_method="mfa")
            record_activity(request.user, "mfa_enrolled", request=request)
        return Response({"enabled": True, "recovery_codes": recovery_codes, **tokens})


class MFARecoveryCodesView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_mfa"

    def post(self, request):
        serializer = MFAReauthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            config = MFAConfiguration.objects.select_for_update().filter(user=request.user, confirmed_at__isnull=False).first()
            if not request.user.mfa_enabled or not config:
                return Response({"detail": "MFA is not enabled."}, status=status.HTTP_400_BAD_REQUEST)
            code = serializer.validated_data.get("code")
            step = verify_totp(decrypt_secret(config.secret_encrypted), code) if code else None
            if step is None or (config.last_used_step is not None and step <= config.last_used_step):
                return Response({"detail": "A valid MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            config.last_used_step = step
            config.save(update_fields=["last_used_step"])
            codes = replace_recovery_codes(config)
        return Response({"recovery_codes": codes})


class MFADisableView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_mfa"

    def post(self, request):
        serializer = MFAReauthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not request.user.check_password(serializer.validated_data["password"]):
            return Response({"detail": "Recent authentication is required."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            config = MFAConfiguration.objects.select_for_update().filter(user=request.user, confirmed_at__isnull=False).first()
            code = serializer.validated_data.get("code")
            if request.user.mfa_enabled and (not config or not code):
                return Response({"detail": "A valid MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            if config:
                step = verify_totp(decrypt_secret(config.secret_encrypted), code)
                valid = step is not None and (config.last_used_step is None or step > config.last_used_step)
                if not valid:
                    code_obj = MFARecoveryCode.objects.select_for_update().filter(configuration=config, code_hash=recovery_hash(code), used_at__isnull=True).first()
                    if code_obj:
                        code_obj.used_at = timezone.now()
                        code_obj.save(update_fields=["used_at"])
                        valid = True
                if not valid:
                    return Response({"detail": "A valid MFA code is required."}, status=status.HTTP_400_BAD_REQUEST)
            disable_mfa(request.user)
        request.user.refresh_from_db()
        tokens = issue_token_pair(request.user, request=request, authentication_method="password")
        record_activity(request.user, "mfa_disabled", request=request)
        return Response({"enabled": False, **tokens})


class RefreshView(TokenRefreshView):
    serializer_class = SecureTokenRefreshSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_refresh"


class LogoutView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh_value = request.data.get("refresh")
        if refresh_value:
            try:
                RefreshToken(refresh_value).blacklist()
            except TokenError:
                pass

        # Revoke the current access token immediately, in addition to the refresh token.
        if request.auth is not None:
            try:
                from .models import RevokedToken

                RevokedToken.objects.get_or_create(
                    jti=str(request.auth["jti"]),
                    defaults={
                        "expires_at": datetime.fromtimestamp(
                            request.auth["exp"], tz=datetime_timezone.utc
                        ),
                    },
                )
            except (TokenError, KeyError, TypeError, ValueError):
                pass
            session_id = request.auth.get("sid")
            if session_id:
                session = UserSession.objects.filter(pk=session_id, user=request.user).first()
                if session:
                    revoke_session(session, event=False, request=request)
                    record_activity(request.user, "logout", request=request, session=session)
        return Response(status=status.HTTP_204_NO_CONTENT)


def session_payload(session, current_id=None):
    return {
        "id": str(session.id),
        "created_at": session.created_at,
        "last_active_at": session.last_activity_at,
        "browser": session.browser_family,
        "operating_system": session.operating_system,
        "device_type": session.device_type,
        "authentication_method": session.authentication_method,
        "active": session.revoked_at is None,
        "current": str(session.id) == str(current_id) if current_id else False,
    }


class SessionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        current_id = request.auth.get("sid") if request.auth else None
        sessions = UserSession.objects.filter(user=request.user, revoked_at__isnull=True).order_by("-last_activity_at")
        return Response({"sessions": [session_payload(session, current_id) for session in sessions]})


class SessionRevokeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, session_id):
        session = UserSession.objects.filter(pk=session_id, user=request.user, revoked_at__isnull=True).first()
        if not session:
            return Response({"detail": "Session not found."}, status=status.HTTP_404_NOT_FOUND)
        if request.auth and str(request.auth.get("sid")) == str(session.id):
            return Response({"detail": "Use sign out to end the current session."}, status=status.HTTP_400_BAD_REQUEST)
        revoke_session(session, request=request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class RevokeOtherSessionsView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        current_id = request.auth.get("sid") if request.auth else None
        if not current_id:
            return Response({"detail": "The current session could not be identified."}, status=status.HTTP_401_UNAUTHORIZED)
        revoked = revoke_other_sessions(request.user, current_id, request=request)
        return Response({"revoked_count": len(revoked)}, status=status.HTTP_200_OK)


class AuthenticationActivityView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        prune_activity(request.user)
        events = AuthenticationActivity.objects.filter(user=request.user).order_by("-occurred_at", "-id")[:ACTIVITY_RESPONSE_LIMIT]
        return Response({"activity": [
            {
                "id": event.id,
                "event_type": event.event_type,
                "timestamp": event.occurred_at,
                "success": event.success,
                "browser": event.browser_family,
                "operating_system": event.operating_system,
                "device_type": event.device_type,
            }
            for event in events
        ]})


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [AuthScopedRateThrottle]
    throttle_scope = "auth_password_reset"

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        user = User.objects.filter(email__iexact=email, is_active=True).first()
        if user:
            uid = signing.dumps({"user_id": user.pk}, salt="fintrack-password-reset")
            token = default_token_generator.make_token(user)
            reset_url = f"{request.build_absolute_uri('/api/auth/password-reset/confirm/')}?uid={uid}&token={token}"
            send_mail(
                "Reset your Fintrack password",
                f"Use this link to reset your password: {reset_url}",
                getattr(settings, "DEFAULT_FROM_EMAIL", "no-reply@fintrack.local"),
                [user.email],
                fail_silently=True,
            )
        return Response(
            {"detail": "If an account matches that email, password reset instructions have been sent."},
            status=status.HTTP_200_OK,
        )


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payload = signing.loads(
                serializer.validated_data["uid"],
                salt="fintrack-password-reset",
                max_age=settings.PASSWORD_RESET_TIMEOUT,
            )
            user = User.objects.get(pk=payload["user_id"], is_active=True)
        except (signing.BadSignature, signing.SignatureExpired, User.DoesNotExist, KeyError, TypeError, ValueError):
            return Response({"detail": "This password reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, serializer.validated_data["token"]):
            return Response({"detail": "This password reset link is invalid or expired."}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            user.set_password(serializer.validated_data["password"])
            reset_time = timezone.now()
            user.auth_epoch = datetime.fromtimestamp(
                int(reset_time.timestamp()), tz=datetime_timezone.utc
            )
            user.save(update_fields=["password", "auth_epoch", "last_login"])
            for outstanding in OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now()):
                BlacklistedToken.objects.get_or_create(token=outstanding)
            revoke_user_sessions(user)
            record_activity(user, "password_reset", request=request)
        return Response({"detail": "Your password has been reset."}, status=status.HTTP_200_OK)


class MeView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        image = request.user.profile_image
        if not image or not image.name:
            return Response({"detail": "No profile image is set."}, status=status.HTTP_404_NOT_FOUND)
        try:
            handle = default_storage.open(image.name, "rb")
        except (FileNotFoundError, OSError):
            logger.warning("Profile image reference is missing for user %s", request.user.pk)
            return Response({"detail": "No profile image is set."}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(handle, content_type="image/jpeg")
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = 'inline; filename="profile-image.jpg"'
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def post(self, request):
        uploaded_file = request.FILES.get("image") or request.FILES.get("profile_image")
        try:
            user = replace_profile_image(request.user, uploaded_file)
        except ProfileImageValidationError as exc:
            return Response({"image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Profile image upload failed for user %s", request.user.pk)
            return Response(
                {"detail": "The profile image could not be saved. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(UserSerializer(user, context={"request": request}).data)

    def delete(self, request):
        try:
            user = delete_profile_image(request.user)
        except Exception:
            logger.exception("Profile image deletion failed for user %s", request.user.pk)
            return Response(
                {"detail": "The profile image could not be deleted. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(UserSerializer(user, context={"request": request}).data)
