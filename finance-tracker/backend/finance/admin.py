# Register your models here.
from django.contrib import admin
from .models import Account, Transaction, SavingGoal, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "user")
    search_fields = ("name",)


@admin.register(Account)
class AccountAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "balance", "created_at")
    search_fields = ("name",)
    ordering = ("-created_at",)


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ("id", "description", "amount", "is_credit", "category", "timestamp")
    list_filter = ("is_credit", "timestamp")


@admin.register(SavingGoal)
class SavingGoalAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "name", "target_amount", "current_amount", "deadline")
    search_fields = ("name", "user__username")
    ordering = ("deadline",)
