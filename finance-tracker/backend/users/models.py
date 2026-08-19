from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
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
