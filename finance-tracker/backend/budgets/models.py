from django.conf import settings
from django.db import models
from finance.models import Category

class Budget(models.Model):
    PERIOD_CHOICES = [
        ("MONTH", "Monthly"),
        ("YEAR", "Yearly"),
        ("CUSTOM", "Custom"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="budgets")
    name = models.CharField(max_length=64)
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES, default="MONTH")
    start_date = models.DateField(null=True, blank=True)  # used if CUSTOM
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"{self.name} ({self.period})"

class BudgetItem(models.Model):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name="budget_items")
    limit_amount = models.DecimalField(max_digits=12, decimal_places=2)

    def __str__(self):
        return f"{self.category.name}: {self.limit_amount}"
