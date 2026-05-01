from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from finance.models import Category


class Budget(models.Model):
    class Period(models.TextChoices):
        MONTH = "MONTH", "Monthly"
        YEAR = "YEAR", "Yearly"
        CUSTOM = "CUSTOM", "Custom"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    name = models.CharField(max_length=120)
    period = models.CharField(
        max_length=10,
        choices=Period.choices,
        default=Period.MONTH,
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-created_at", "name"]
        indexes = [
            models.Index(fields=["user", "period"], name="budget_user_period_idx"),
            models.Index(
                fields=["user", "start_date", "end_date"],
                name="budget_user_range_idx",
            ),
        ]

    def clean(self):
        if self.period == self.Period.CUSTOM and (
            not self.start_date or not self.end_date
        ):
            raise ValidationError(
                {"end_date": "Custom budgets require both start and end dates."}
            )

        if self.start_date and self.end_date and self.start_date > self.end_date:
            raise ValidationError(
                {"end_date": "Budget end date must be on or after the start date."}
            )

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user} - {self.name} ({self.get_period_display()})"


class BudgetItem(models.Model):
    budget = models.ForeignKey(Budget, on_delete=models.CASCADE, related_name="items")
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name="budget_items",
    )
    limit_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
    )
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["category__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["budget", "category"],
                name="unique_budget_category_item",
            )
        ]
        indexes = [
            models.Index(
                fields=["budget", "category"],
                name="budget_item_category_idx",
            ),
        ]

    def clean(self):
        if self.category_id and self.category.category_type != Category.Type.EXPENSE:
            raise ValidationError(
                {"category": "Budget items can only be linked to expense categories."}
            )

        budget_user_id = getattr(self.budget, "user_id", None)
        if self.category_id and self.category.user_id not in (None, budget_user_id):
            raise ValidationError(
                {
                    "category": (
                        "Budget items can only use default categories or the budget "
                        "owner's categories."
                    )
                }
            )

    def save(self, *args, **kwargs):
        self.updated_at = timezone.now()
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.budget.name} - {self.category.name}: {self.limit_amount}"
