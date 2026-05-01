from django.contrib import admin

from .models import Budget, BudgetItem


class BudgetItemInline(admin.TabularInline):
    model = BudgetItem
    extra = 1
    autocomplete_fields = ["category"]
    fields = ["category", "limit_amount"]


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "name",
        "user",
        "period",
        "start_date",
        "end_date",
        "item_count",
    )
    list_filter = ("period", "start_date", "end_date")
    search_fields = ("name", "user__username", "user__email")
    autocomplete_fields = ["user"]
    readonly_fields = ("created_at", "updated_at")
    inlines = [BudgetItemInline]

    @admin.display(description="Items")
    def item_count(self, obj):
        return obj.items.count()


@admin.register(BudgetItem)
class BudgetItemAdmin(admin.ModelAdmin):
    list_display = ("id", "budget", "category", "limit_amount", "updated_at")
    list_filter = ("category", "budget")
    search_fields = ("budget__name", "category__name", "budget__user__username")
    autocomplete_fields = ["budget", "category"]
    readonly_fields = ("created_at", "updated_at")
