from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError, transaction
from django.urls import reverse
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import AuthenticationFailed
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from .username import UsernamePolicyError, canonicalize_username, normalize_username
from .mfa import generate_challenge_token
from .models import MFAChallenge
from .models import UserSession
from .session_services import record_activity
from .tokens import auth_epoch_claim, issue_token_pair
from django.conf import settings
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


def user_field_default(field_name):
    return User._meta.get_field(field_name).default


class UserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "profile_image_url",
            "username",
            "email",
            "first_name",
            "last_name",
            "display_name",
            "phone_number",
            "country",
            "default_currency",
            "locale",
            "timezone",
            "ai_personalization_enabled",
            "notification_budget_updates",
            "notification_goal_updates",
            "notification_account_activity",
        )
        read_only_fields = ("id", "profile_image_url")
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
            "username": {"validators": []},
        }

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        request = self.context.get("request")
        path = reverse("profile-image")
        return request.build_absolute_uri(path) if request else path

    def validate_username(self, value):
        try:
            username = normalize_username(value)
        except UsernamePolicyError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        queryset = User.objects.filter(username_canonical=username)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Username is already taken.")
        return username

    def validate_email(self, value):
        email = value.strip().lower()
        queryset = User.objects.filter(email__iexact=email)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return email

    def validate_default_currency(self, value):
        currency = value.strip().upper()
        if len(currency) != 3 or not currency.isalpha():
            raise serializers.ValidationError(
                "Currency must be a three-letter ISO 4217 code."
            )
        return currency

    def validate_timezone(self, value):
        timezone = value.strip()
        try:
            ZoneInfo(timezone)
        except (ZoneInfoNotFoundError, ValueError):
            raise serializers.ValidationError("Choose a valid IANA timezone.")
        return timezone

    def validate_phone_number(self, value):
        phone_number = value.strip()
        if phone_number and (
            len(phone_number) < 7
            or any(character not in "+0123456789 ()-." for character in phone_number)
        ):
            raise serializers.ValidationError("Enter a valid phone number.")
        return phone_number

    def validate(self, attrs):
        for field_name in ("first_name", "last_name", "display_name", "country", "locale"):
            if field_name in attrs:
                attrs[field_name] = attrs[field_name].strip()
        return attrs

    def update(self, instance, validated_data):
        try:
            with transaction.atomic():
                return super().update(instance, validated_data)
        except IntegrityError as exc:
            raise serializers.ValidationError({"username": "Username is already taken."}) from exc


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "default_currency",
            "locale",
            "timezone",
            "ai_personalization_enabled",
        )
        extra_kwargs = {
            "email": {"required": True, "allow_blank": False},
            "username": {"validators": []},
            "first_name": {"required": False},
            "last_name": {"required": False},
            "default_currency": {"required": False},
            "locale": {"required": False},
            "timezone": {"required": False},
            "ai_personalization_enabled": {"required": False},
        }

    def validate_username(self, value):
        try:
            username = normalize_username(value)
        except UsernamePolicyError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        if User.objects.filter(username_canonical=username).exists():
            raise serializers.ValidationError("Username is already taken.")
        return username

    def validate_email(self, value):
        normalized_email = value.strip().lower()
        if User.objects.filter(email__iexact=normalized_email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return normalized_email

    def validate_default_currency(self, value):
        return value.upper()

    def validate(self, attrs):
        password_confirm = attrs.pop("password_confirm", None)
        if password_confirm is not None and attrs["password"] != password_confirm:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})

        validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        try:
            with transaction.atomic():
                return User.objects.create_user(
                    username=validated_data["username"],
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data.get("first_name", ""),
                    last_name=validated_data.get("last_name", ""),
                    default_currency=validated_data.get("default_currency", user_field_default("default_currency")),
                    locale=validated_data.get("locale", user_field_default("locale")),
                    timezone=validated_data.get("timezone", user_field_default("timezone")),
                    ai_personalization_enabled=validated_data.get(
                        "ai_personalization_enabled",
                        user_field_default("ai_personalization_enabled"),
                    ),
                )
        except IntegrityError as exc:
            raise serializers.ValidationError({"username": "Username is already taken."}) from exc


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        try:
            attrs["username"] = canonicalize_username(attrs.get("username", ""))
        except UsernamePolicyError as exc:
            raise serializers.ValidationError({"username": "Enter your username."}) from exc
        username = attrs.get("username", "")
        password = attrs.get("password", "")
        user = authenticate(self.context.get("request"), username=username, password=password)
        if user is None:
            failed_user = User.objects.filter(username_canonical=username, is_active=True).first()
            if failed_user:
                record_activity(failed_user, "login_failure", request=self.context.get("request"), success=False)
            raise AuthenticationFailed("No active account found with the given credentials")
        self.user = user
        if user.mfa_enabled:
            token, token_hash = generate_challenge_token()
            MFAChallenge.objects.create(
                user=user,
                token_hash=token_hash,
                expires_at=timezone.now() + timedelta(seconds=settings.MFA_CHALLENGE_TIMEOUT_SECONDS),
            )
            return {"mfa_required": True, "mfa_challenge": token}
        data = issue_token_pair(user, request=self.context.get("request"), authentication_method="password")
        data["user"] = UserSerializer(user).data
        return data


class SecureTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        refresh = self.token_class(attrs["refresh"])
        user_id = refresh.get("user_id")
        user = User.objects.filter(pk=user_id, is_active=True).first()
        if not user or (user.auth_epoch and refresh.get("auth_epoch") != auth_epoch_claim(user)):
            raise AuthenticationFailed("Authentication credentials were invalid.", code="token_invalidated")
        session_id = refresh.get("sid")
        if not session_id or not UserSession.objects.filter(pk=session_id, user=user, revoked_at__isnull=True).exists():
            raise AuthenticationFailed("Authentication credentials were invalid.", code="session_revoked")
        UserSession.objects.filter(pk=session_id).update(last_activity_at=timezone.now())
        return super().validate(attrs)


class MFAChallengeSerializer(serializers.Serializer):
    challenge = serializers.CharField(max_length=128)
    code = serializers.CharField(max_length=64, trim_whitespace=True)


class MFAEnrollmentConfirmSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=16, trim_whitespace=True)


class MFAReauthSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    code = serializers.CharField(max_length=64, required=False, allow_blank=False)


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True, required=False)

    def validate(self, attrs):
        if attrs.get("password_confirm") is not None and attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        validate_password(attrs["password"])
        return attrs
