from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.db import models
from uuid import uuid4

from .username import UsernamePolicyError, canonicalize_username, normalize_username


def profile_image_upload_to(instance, filename):
    """Return a private, server-generated storage key for a user's image."""
    return f"profile-images/user-{instance.pk}/{uuid4().hex}.jpg"


class User(AbstractUser):
    username_canonical = models.CharField(
        max_length=150,
        unique=True,
        editable=False,
        help_text="NFKC/case-folded identity key used for lookup and uniqueness.",
    )
    # Tokens issued before this timestamp are rejected after a security event.
    auth_epoch = models.DateTimeField(null=True, blank=True, editable=False)
    profile_image = models.ImageField(
        upload_to=profile_image_upload_to,
        blank=True,
        null=True,
        max_length=255,
        help_text="Normalized profile image stored in private media storage.",
    )
    display_name = models.CharField(
        max_length=150,
        blank=True,
        help_text="Preferred name shown throughout Fintrack.",
    )
    phone_number = models.CharField(
        max_length=32,
        blank=True,
        help_text="Optional account contact number.",
    )
    country = models.CharField(
        max_length=80,
        blank=True,
        help_text="Country used for account context and regional defaults.",
    )
    default_currency = models.CharField(
        max_length=3,
        default="KES",
        help_text="Preferred ISO 4217 currency code for finance defaults.",
    )
    locale = models.CharField(
        max_length=20,
        default="en-KE",
        help_text="Preferred locale for formatting and future personalization.",
    )
    timezone = models.CharField(
        max_length=64,
        default="Africa/Nairobi",
        help_text="Preferred timezone for reports, reminders, and insights.",
    )
    ai_personalization_enabled = models.BooleanField(
        default=True,
        help_text="Allows future AI features to tailor insights to this user.",
    )
    notification_budget_updates = models.BooleanField(
        default=True,
        help_text="Receive account notifications about budget progress.",
    )
    notification_goal_updates = models.BooleanField(
        default=True,
        help_text="Receive account notifications about saving goal progress.",
    )
    notification_account_activity = models.BooleanField(
        default=True,
        help_text="Receive account notifications about important account activity.",
    )

    def __str__(self):
        return self.get_username()

    def save(self, *args, **kwargs):
        username_changed = self._state.adding
        if not username_changed and self.pk:
            previous = type(self).objects.filter(pk=self.pk).values_list("username", flat=True).first()
            username_changed = previous != self.username
        if username_changed:
            try:
                self.username = normalize_username(self.username)
            except UsernamePolicyError as exc:
                raise ValidationError({"username": str(exc)}) from exc
        self.username_canonical = canonicalize_username(self.username)
        update_fields = kwargs.get("update_fields")
        if update_fields is not None and username_changed:
            kwargs["update_fields"] = set(update_fields) | {"username_canonical"}
        return super().save(*args, **kwargs)


class RevokedToken(models.Model):
    """Access-token JTIs revoked before their natural expiry."""

    jti = models.CharField(max_length=255, unique=True)
    expires_at = models.DateTimeField()
    revoked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=("jti", "expires_at"))]
