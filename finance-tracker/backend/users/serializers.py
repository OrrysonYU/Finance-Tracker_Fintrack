from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


def user_field_default(field_name):
    return User._meta.get_field(field_name).default


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "default_currency",
            "locale",
            "timezone",
            "ai_personalization_enabled",
        )
        read_only_fields = ("id", "username", "email")


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
