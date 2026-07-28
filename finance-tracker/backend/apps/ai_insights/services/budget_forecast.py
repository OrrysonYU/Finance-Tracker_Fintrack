"""Run-rate based budget forecasts with explainable risk classifications."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from budgets.services.utilization_service import get_budget_period
from finance.models import Transaction
from reports.services.monthly_summary import money


ZERO = Decimal("0.00")
ONE_HUNDRED = Decimal("100")


def _percent(part, whole):
    if whole <= ZERO:
        return ZERO
    return ((part / whole) * ONE_HUNDRED).quantize(Decimal("0.01"))


def _risk_status(*, limit, spent, projected, has_started):
    if limit <= ZERO:
        return "no_budget"
    if not has_started:
        return "not_started"
    if spent > limit:
        return "over_budget"
    if projected > limit:
        return "at_risk"
    return "on_track"


def _projection(*, spent, limit, elapsed_days, total_days, has_started, is_complete):
    if elapsed_days <= 0:
        run_rate = ZERO
        projected = ZERO
    elif is_complete:
        run_rate = money(spent / Decimal(elapsed_days))
        projected = money(spent)
    else:
        run_rate = money(spent / Decimal(elapsed_days))
        projected = money((spent / Decimal(elapsed_days)) * Decimal(total_days))

    return {
        "limit": money(limit),
        "spent_to_date": money(spent),
        "run_rate_per_day": run_rate,
        "projected_spend": projected,
        "projected_remaining": money(limit - projected),
        "usage_percent": _percent(spent, limit),
        "projected_usage_percent": _percent(projected, limit),
        "risk_status": _risk_status(
            limit=limit,
            spent=spent,
            projected=projected,
            has_started=has_started,
        ),
    }


def calculate_budget_forecast(budget, as_of=None):
    """Project budget spend from the average daily spend observed so far."""

    as_of = as_of or timezone.localdate()
    start_date, end_date = get_budget_period(budget, as_of=as_of)
    total_days = (end_date - start_date).days + 1
    has_started = as_of >= start_date
    is_complete = as_of >= end_date

    if not has_started:
        elapsed_days = 0
        spending_cutoff = None
    else:
        spending_cutoff = min(as_of, end_date)
        elapsed_days = (spending_cutoff - start_date).days + 1

    budget_items = list(budget.items.select_related("category").all())
    category_ids = [item.category_id for item in budget_items]
    spent_by_category = {}

    if spending_cutoff is not None and category_ids:
        rows = (
            Transaction.objects.filter(
                account__user=budget.user,
                category_id__in=category_ids,
                is_credit=False,
                timestamp__date__gte=start_date,
                timestamp__date__lte=spending_cutoff,
            )
            .values("category_id")
            .annotate(spent=Sum("amount"))
        )
        spent_by_category = {
            row["category_id"]: money(row["spent"])
            for row in rows
        }

    items = []
    total_limit = ZERO
    total_spent = ZERO

    for item in budget_items:
        limit_amount = money(item.limit_amount)
        spent = spent_by_category.get(item.category_id, ZERO)
        item_projection = _projection(
            spent=spent,
            limit=limit_amount,
            elapsed_days=elapsed_days,
            total_days=total_days,
            has_started=has_started,
            is_complete=is_complete,
        )
        items.append(
            {
                "id": item.id,
                "category_id": item.category_id,
                "category_name": item.category.name,
                **item_projection,
            }
        )
        total_limit += limit_amount
        total_spent += spent

    totals = _projection(
        spent=money(total_spent),
        limit=money(total_limit),
        elapsed_days=elapsed_days,
        total_days=total_days,
        has_started=has_started,
        is_complete=is_complete,
    )

    return {
        "budget": {
            "id": budget.id,
            "name": budget.name,
            "period": budget.period,
        },
        "range": {
            "start": start_date,
            "end": end_date,
            "as_of": as_of,
        },
        "days": {
            "elapsed": elapsed_days,
            "remaining": max(total_days - elapsed_days, 0),
            "total": total_days,
        },
        "items": items,
        "totals": totals,
    }


forecast_budget = calculate_budget_forecast


__all__ = ["calculate_budget_forecast", "forecast_budget"]
