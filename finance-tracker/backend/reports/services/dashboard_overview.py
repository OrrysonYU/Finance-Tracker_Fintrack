from decimal import Decimal

from django.utils import timezone

from budgets.models import Budget
from budgets.services.utilization_service import calculate_budget_utilization
from finance.models import Account, SavingGoal
from reports.services.category_spend import calculate_category_spend
from reports.services.monthly_summary import calculate_monthly_summary, money


ZERO = Decimal("0.00")


def _percent(part, whole):
    if whole <= 0:
        return ZERO
    return ((part / whole) * Decimal("100")).quantize(Decimal("0.01"))


def _account_snapshot(user):
    accounts = Account.objects.filter(user=user).order_by("name", "id")
    items = []
    currency_totals = {}
    total_balance = ZERO

    for account in accounts:
        balance = money(account.balance)
        total_balance += balance
        currency_totals[account.currency] = money(
            currency_totals.get(account.currency, ZERO) + balance
        )
        items.append(
            {
                "id": account.id,
                "name": account.name,
                "type": account.type,
                "currency": account.currency,
                "balance": balance,
            }
        )

    return {
        "count": len(items),
        "total_balance": money(total_balance),
        "currency_totals": [
            {"currency": currency, "balance": balance}
            for currency, balance in sorted(currency_totals.items())
        ],
        "items": items,
    }


def _goal_snapshot(user):
    goals = SavingGoal.objects.filter(user=user).order_by("deadline", "name", "id")
    items = []
    total_target = ZERO
    total_current = ZERO
    completed_count = 0

    for goal in goals:
        target_amount = money(goal.target_amount)
        current_amount = money(goal.current_amount)
        total_target += target_amount
        total_current += current_amount
        if goal.is_completed:
            completed_count += 1
        items.append(
            {
                "id": goal.id,
                "name": goal.name,
                "currency": goal.currency,
                "target_amount": target_amount,
                "current_amount": current_amount,
                "remaining_amount": money(goal.remaining_amount),
                "progress_percent": goal.progress_percent,
                "is_completed": goal.is_completed,
                "deadline": goal.deadline,
            }
        )

    return {
        "count": len(items),
        "active_count": len(items) - completed_count,
        "completed_count": completed_count,
        "total_target": money(total_target),
        "total_current": money(total_current),
        "total_remaining": money(total_target - total_current),
        "progress_percent": _percent(total_current, total_target),
        "next_deadline": next(
            (
                goal["deadline"]
                for goal in items
                if not goal["is_completed"] and goal["deadline"] is not None
            ),
            None,
        ),
        "items": items[:5],
    }


def _is_budget_active(utilization, as_of):
    period_range = utilization["range"]
    return period_range["start"] <= as_of <= period_range["end"]


def _budget_signals(user, as_of=None):
    as_of = as_of or timezone.localdate()
    budgets = Budget.objects.filter(user=user).prefetch_related("items__category")
    highlights = []
    total_limit = ZERO
    total_spent = ZERO
    over_budget_count = 0
    near_limit_count = 0

    for budget in budgets:
        utilization = calculate_budget_utilization(budget, as_of=as_of)
        if not _is_budget_active(utilization, as_of):
            continue

        totals = utilization["totals"]
        limit_amount = money(totals["limit"])
        spent = money(totals["spent"])
        remaining = money(totals["remaining"])
        usage_percent = totals["usage_percent"]
        is_over_budget = totals["is_over_budget"]

        total_limit += limit_amount
        total_spent += spent
        if is_over_budget:
            over_budget_count += 1
        elif usage_percent >= Decimal("80.00"):
            near_limit_count += 1

        highlights.append(
            {
                "id": budget.id,
                "name": budget.name,
                "period": budget.period,
                "range": utilization["range"],
                "limit": limit_amount,
                "spent": spent,
                "remaining": remaining,
                "usage_percent": usage_percent,
                "is_over_budget": is_over_budget,
                "item_count": len(utilization["items"]),
            }
        )

    highlights.sort(
        key=lambda item: (item["is_over_budget"], item["usage_percent"], item["spent"]),
        reverse=True,
    )

    return {
        "active_count": len(highlights),
        "over_budget_count": over_budget_count,
        "near_limit_count": near_limit_count,
        "total_limit": money(total_limit),
        "total_spent": money(total_spent),
        "total_remaining": money(total_limit - total_spent),
        "usage_percent": _percent(total_spent, total_limit),
        "highlights": highlights[:5],
    }


def calculate_dashboard_overview(user, anchor_date=None):
    """Build a frontend-friendly dashboard payload from reusable report services."""
    anchor_date = anchor_date or timezone.localdate()

    return {
        "generated_at": timezone.now(),
        "period": f"{anchor_date:%Y-%m}",
        "summary": calculate_monthly_summary(user, anchor_date),
        "category_spend": calculate_category_spend(user, anchor_date),
        "accounts": _account_snapshot(user),
        "goals": _goal_snapshot(user),
        "budgets": _budget_signals(user, as_of=anchor_date),
    }
