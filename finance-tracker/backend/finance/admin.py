# Register your models here.
from django.contrib import admin

from .models import Account, Transaction, SavingGoal, Category
from .services import balance_service


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "category_type",
        "scope",
        "is_active",
        "updated_at",
    )
    list_filter = ("category_type", "is_active", "user")
    search_fields = ("name", "slug", "user__username", "user__email")
    ordering = ("category_type", "name")
    readonly_fields = ("created_at", "updated_at")

    def scope(self, obj):
        return "Default" if obj.is_default else obj.user


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "name",
        "type",
        "opening_balance",
        "balance",
        "currency",
        "created_at",
    )
    list_filter = ("type", "currency")
    search_fields = ("name", "user__username", "user__email")
    ordering = ("name",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "account",
        "description",
        "amount",
        "is_credit",
        "category",
        "timestamp",
    )
    list_filter = ("is_credit", "timestamp", "category")
    search_fields = ("description", "account__name", "account__user__username")

    def save_model(self, request, obj, form, change):
        previous_account = None
        if change and obj.pk:
            previous_account = Transaction.objects.get(pk=obj.pk).account

        super().save_model(request, obj, form, change)

        if previous_account:
            balance_service.sync_account_balance(previous_account)
            if previous_account.pk != obj.account_id:
                balance_service.sync_account_balance(obj.account)
            return

        balance_service.sync_account_balance(obj.account)

    def delete_model(self, request, obj):
        account = obj.account
        super().delete_model(request, obj)
        balance_service.sync_account_balance(account)

    def delete_queryset(self, request, queryset):
        accounts = list(Account.objects.filter(transactions__in=queryset).distinct())
        super().delete_queryset(request, queryset)
        for account in accounts:
            balance_service.sync_account_balance(account)


@admin.register(SavingGoal)
class SavingGoalAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "target_amount", "current_amount", "deadline")
    search_fields = ("name", "user__username")
    ordering = ("deadline",)
