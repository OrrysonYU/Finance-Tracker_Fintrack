from calendar import monthrange
from decimal import Decimal

from django.db.models import Q, Sum
from django.utils import timezone

from finance.models import Transaction


ZERO = Decimal("0.00")


def get_month_range(anchor_date=None):
    """Return the local calendar month range for report calculations."""
    anchor_date = anchor_date or timezone.localdate()
    start_date = anchor_date.replace(day=1)
    end_date = anchor_date.replace(
        day=monthrange(anchor_date.year, anchor_date.month)[1]
    )
    return start_date, end_date


def money(value):
    return (value or ZERO).quantize(Decimal("0.01"))


def calculate_monthly_summary(user, anchor_date=None):
    """Calculate income, expense, and net totals for one user's current month."""
    start_date, end_date = get_month_range(anchor_date)
    transactions = Transaction.objects.filter(
        account__user=user,
        timestamp__date__gte=start_date,
        timestamp__date__lte=end_date,
    )

    totals = transactions.aggregate(
        income=Sum("amount", filter=Q(is_credit=True)),
        expense=Sum("amount", filter=Q(is_credit=False)),
    )
    income = money(totals["income"])
    expense = money(totals["expense"])

    return {
        "period": f"{start_date:%Y-%m}",
        "period_start": start_date,
        "period_end": end_date,
        "income": income,
        "expense": expense,
        "net": money(income - expense),
        "transaction_count": transactions.count(),
    }
