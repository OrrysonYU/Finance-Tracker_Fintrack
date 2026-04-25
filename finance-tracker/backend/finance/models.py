from decimal import Decimal
from django.db import models
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.validators import MinValueValidator
from django.utils import timezone

User = get_user_model()


class Account(models.Model):
    """Bank accounts, mobile money, cash wallets, etc."""
    class Type(models.TextChoices):
        BANK = "BANK", "Bank"
        CASH = "CASH", "Cash"
        MOBILE_MONEY = "MOBILE_MONEY", "Mobile Money"
        INVESTMENT = "INVESTMENT", "Investment"
        CREDIT_CARD = "CREDIT_CARD", "Credit Card"
        OTHER = "OTHER", "Other"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="accounts")
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=50, choices=Type.choices, default=Type.OTHER)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="KES")  # or USD, EUR, etc.
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user} • {self.name} ({self.type}) • {self.balance} {self.currency}"


class Category(models.Model):
    name = models.CharField(max_length=64, unique=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="categories",
        null=True,
        blank=True,
    )
    # user=None => global default category (shared)

    def __str__(self):
        return self.name


class Transaction(models.Model):
    """Financial transaction linked to an account."""
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="transactions")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    description = models.CharField(max_length=255, blank=True, default="")
    is_credit = models.BooleanField(
        default=False,
        help_text="True = income/credit, False = expense/debit",
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self):
        direction = "+" if self.is_credit else "-"
        return f"{self.account.name}: {direction}{self.amount} {self.account.currency} ({self.description})"


class SavingGoal(models.Model):
    """User can set saving goals for projects (vacation, emergency fund, etc.)"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="saving_goals")
    name = models.CharField(max_length=120)
    target_amount = models.DecimalField(max_digits=12, decimal_places=2)
    current_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    deadline = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def progress(self):
        if self.target_amount > 0:
            return round((self.current_amount / self.target_amount) * 100, 2)
        return 0

    def __str__(self):
        return f"{self.user} • {self.name} ({self.progress}%)"


class Investment(models.Model):
    """Track investments like stocks, crypto, real estate, etc."""
    class Type(models.TextChoices):
        STOCK = "STOCK", "Stock"
        CRYPTO = "CRYPTO", "Crypto"
        REAL_ESTATE = "REAL_ESTATE", "Real Estate"
        BOND = "BOND", "Bond"
        FUND = "FUND", "Mutual Fund"
        OTHER = "OTHER", "Other"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="investments")
    name = models.CharField(max_length=120)
    type = models.CharField(max_length=50, choices=Type.choices)
    amount_invested = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField(default=timezone.now)
    notes = models.TextField(blank=True)

    @property
    def roi(self):
        """Return on Investment in %"""
        if self.amount_invested > 0:
            return round(((self.current_value - self.amount_invested) / self.amount_invested) * 100, 2)
        return 0

    def __str__(self):
        return f"{self.user} • {self.name} ({self.type}) ROI: {self.roi}%"


class Loan(models.Model):
    """Track debts or loans (given or taken)."""
    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", "Active"
        PAID = "PAID", "Paid"
        DEFAULTED = "DEFAULTED", "Defaulted"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="loans")
    lender = models.CharField(max_length=120)  # Bank, SACCO, Person
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="As % per year")
    start_date = models.DateField(default=timezone.now)
    due_date = models.DateField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)

    def __str__(self):
        return f"{self.user} • Loan from {self.lender} ({self.amount})"


class Subscription(models.Model):
    """Track recurring expenses like Netflix, Spotify, Rent, Gym, etc."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="subscriptions")
    name = models.CharField(max_length=120)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    frequency = models.CharField(
        max_length=20,
        choices=[("DAILY", "Daily"), ("WEEKLY", "Weekly"), ("MONTHLY", "Monthly"), ("YEARLY", "Yearly")],
        default="MONTHLY",
    )
    next_payment_date = models.DateField()

    def __str__(self):
        return f"{self.user} • {self.name} • {self.amount} ({self.frequency})"
