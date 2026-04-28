from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
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

    def __str__(self):
        return self.get_username()
