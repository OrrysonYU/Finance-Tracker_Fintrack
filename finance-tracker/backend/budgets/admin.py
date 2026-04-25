# Register your models here.
from django.contrib import admin
from .models import Budget, BudgetItem

@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "period", "start_date", "end_date")
    list_filter = ("period", "start_date", "end_date")

@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ("id", "budget", "category", "limit_amount")
    list_filter = ("category", "budget")
