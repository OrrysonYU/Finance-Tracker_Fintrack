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
                    "default_currency",
                    "locale",
                    "timezone",
                    "ai_personalization_enabled",
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
                    "default_currency",
                    "locale",
                    "timezone",
                    "ai_personalization_enabled",
                ),
            },
        ),
    )
    list_display = (
        "username",
        "email",
        "default_currency",
        "locale",
        "is_staff",
        "is_active",
    )
    list_filter = UserAdmin.list_filter + ("default_currency", "locale")
