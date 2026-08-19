from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.urls import reverse
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

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
        }

    def get_profile_image_url(self, obj):
        if not obj.profile_image:
            return None
        request = self.context.get("request")
        path = reverse("profile-image")
        return request.build_absolute_uri(path) if request else path

    def validate_username(self, value):
        username = value.strip()
        queryset = User.objects.filter(username__iexact=username)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("A user with this username already exists.")
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
            "first_name": {"required": False},
            "last_name": {"required": False},
            "default_currency": {"required": False},
            "locale": {"required": False},
            "timezone": {"required": False},
            "ai_personalization_enabled": {"required": False},
        }

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value

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


class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


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
