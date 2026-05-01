from calendar import monthrange
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db.models import Sum
from django.utils import timezone

from budgets.models import Budget
from finance.models import Transaction


ZERO = Decimal("0.00")


def _money(value):
    return Decimal(value or ZERO).quantize(Decimal("0.01"))


def _usage_percent(spent, limit):
    if limit <= 0:
        return ZERO
    return ((spent / limit) * Decimal("100")).quantize(Decimal("0.01"))


def get_budget_period(budget, as_of=None):
    current_date = as_of or timezone.localdate()

    if budget.period == Budget.Period.MONTH:
        last_day = monthrange(current_date.year, current_date.month)[1]
        return (
            current_date.replace(day=1),
            current_date.replace(day=last_day),
        )

    if budget.period == Budget.Period.YEAR:
        return (
            current_date.replace(month=1, day=1),
            current_date.replace(month=12, day=31),
        )

    if not budget.start_date or not budget.end_date:
        raise ValidationError("Custom budgets require both start and end dates.")

    if budget.start_date > budget.end_date:
        raise ValidationError("Budget end date must be on or after the start date.")

    return budget.start_date, budget.end_date


def calculate_budget_utilization(budget, as_of=None):
    start_date, end_date = get_budget_period(budget, as_of=as_of)
    budget_items = list(budget.items.select_related("category"))
    category_ids = [item.category_id for item in budget_items]

    spent_rows = (
        Transaction.objects.filter(
            account__user=budget.user,
            category_id__in=category_ids,
            is_credit=False,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        .values("category_id")
        .annotate(spent=Sum("amount"))
    )
    spent_by_category = {
        row["category_id"]: _money(row["spent"])
        for row in spent_rows
    }

    items = []
    total_limit = ZERO
    total_spent = ZERO

    for item in budget_items:
        limit_amount = _money(item.limit_amount)
        spent = spent_by_category.get(item.category_id, ZERO)
        remaining = _money(limit_amount - spent)
        total_limit += limit_amount
        total_spent += spent

        items.append(
            {
                "id": item.id,
                "category": item.category_id,
                "category_name": item.category.name,
                "limit_amount": limit_amount,
                "spent": spent,
                "remaining": remaining,
                "usage_percent": _usage_percent(spent, limit_amount),
                "is_over_budget": spent > limit_amount,
            }
        )

    total_remaining = _money(total_limit - total_spent)

    return {
        "budget": {
            "id": budget.id,
            "name": budget.name,
            "period": budget.period,
        },
        "range": {
            "start": start_date,
            "end": end_date,
        },
        "items": items,
        "totals": {
            "limit": _money(total_limit),
            "spent": _money(total_spent),
            "remaining": total_remaining,
            "usage_percent": _usage_percent(total_spent, total_limit),
            "is_over_budget": total_spent > total_limit,
        },
    }
