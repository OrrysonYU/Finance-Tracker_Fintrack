from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User


@admin.register(User)
class FintrackUserAdmin(UserAdmin):
    fieldsets = UserAdmin.fieldsets + (
        (
            "Fintrack preferences",
            {
                "fields": (
                    "display_name",
                    "profile_image",
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
            },
        ),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "Fintrack preferences",
            {
                "classes": ("wide",),
                "fields": (
                    "display_name",
                    "profile_image",
                    "phone_number",
                    "country",
                    "default_currency",
                    "locale",
                    "timezone",
                    "ai_personalization_enabled",
                    "notification_budget_updates",
                    "notification_goal_updates",
                    "notification_account_activity",
                ),
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "display_name",
        "default_currency",
        "locale",
        "is_staff",
        "is_active",
    )
    list_filter = UserAdmin.list_filter + ("default_currency", "locale")
