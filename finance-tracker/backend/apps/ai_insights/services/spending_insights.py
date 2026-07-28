"""Explainable, deterministic observations about a user's monthly spending."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from reports.services.category_spend import calculate_category_spend
from reports.services.monthly_summary import (
    calculate_monthly_summary,
    get_month_range,
    money,
)


ZERO = Decimal("0.00")
ONE_HUNDRED = Decimal("100")
DEFAULT_INSIGHT_LIMIT = 4
MAX_INSIGHT_LIMIT = 10
MAX_INCREASE_INSIGHTS = 2


@dataclass(frozen=True, slots=True)
class SpendingInsight:
    """A frontend-friendly observation with supporting calculation data."""

    type: str
    title: str
    message: str
    action: str
    data: dict

    def as_dict(self):
        return asdict(self)


def _percent(part, whole):
    if whole <= ZERO:
        return ZERO
    return ((part / whole) * ONE_HUNDRED).quantize(Decimal("0.01"))


def _display_amount(value):
    return f"{money(value):,.2f}"


def _top_category_insight(category_spend, month_name):
    if not category_spend["by_category"]:
        return None

    category_name, amount = max(
        category_spend["by_category"].items(),
        key=lambda item: (item[1], item[0]),
    )
    share = _percent(amount, category_spend["total"])
    return SpendingInsight(
        type="top_spending_category",
        title="Your largest spending category",
        message=(
            f"{category_name} was your top spending category in {month_name} at "
            f"{_display_amount(amount)}, accounting for {share:.1f}% of spending."
        ),
        action="Review its largest transactions for quick savings opportunities.",
        data={
            "category_name": category_name,
            "amount": money(amount),
            "share_percent": share,
        },
    )


def _increase_insights(current_spend, previous_spend, previous_month_name):
    increases = []
    previous_categories = previous_spend["by_category"]

    for category_name, current_amount in current_spend["by_category"].items():
        previous_amount = previous_categories.get(category_name, ZERO)
        if previous_amount <= ZERO or current_amount <= previous_amount:
            continue

        increase_amount = money(current_amount - previous_amount)
        increase_percent = _percent(increase_amount, previous_amount)
        increases.append(
            (
                increase_amount,
                SpendingInsight(
                    type="month_over_month_increase",
                    title=f"{category_name} spending increased",
                    message=(
                        f"{category_name} spending rose by "
                        f"{_display_amount(increase_amount)} "
                        f"({increase_percent:.1f}%) "
                        f"compared with {previous_month_name}."
                    ),
                    action=(
                        "Check whether the increase was planned and adjust the category "
                        "limit if needed."
                    ),
                    data={
                        "category_name": category_name,
                        "current_amount": money(current_amount),
                        "previous_amount": money(previous_amount),
                        "increase_amount": increase_amount,
                        "increase_percent": increase_percent,
                    },
                ),
            )
        )

    increases.sort(
        key=lambda item: (item[0], item[1].data["increase_percent"]),
        reverse=True,
    )
    return [insight for _, insight in increases[:MAX_INCREASE_INSIGHTS]]


def _savings_insight(summary, month_name):
    income = summary["income"]
    expense = summary["expense"]
    net = summary["net"]

    if income > ZERO and net > ZERO:
        savings_rate = _percent(net, income)
        return SpendingInsight(
            type="savings_nudge",
            title="Put this month's surplus to work",
            message=(
                f"You kept {_display_amount(net)} of {month_name}'s recorded income, "
                f"a {savings_rate:.1f}% savings rate."
            ),
            action="Consider moving part of the surplus to a savings goal.",
            data={
                "income": income,
                "expense": expense,
                "surplus": net,
                "savings_rate_percent": savings_rate,
            },
        )

    if income > ZERO and net == ZERO:
        return SpendingInsight(
            type="savings_nudge",
            title="Create room to save",
            message=f"Recorded spending matched income in {month_name}.",
            action=(
                "Choose one flexible category to trim next month and save the "
                "difference."
            ),
            data={"income": income, "expense": expense, "shortfall": ZERO},
        )

    if income > ZERO:
        shortfall = money(-net)
        return SpendingInsight(
            type="savings_nudge",
            title="Spending is above income",
            message=(
                f"Recorded spending exceeded income by {_display_amount(shortfall)} "
                f"in {month_name}."
            ),
            action=(
                "Review the largest category first and set a lower limit for next "
                "month."
            ),
            data={"income": income, "expense": expense, "shortfall": shortfall},
        )

    return SpendingInsight(
        type="savings_nudge",
        title="Complete the picture before setting a savings target",
        message=(
            f"No income is recorded for {month_name}, while recorded spending totals "
            f"{_display_amount(expense)}."
        ),
        action="Add any missing income, then choose a realistic amount to save.",
        data={"income": income, "expense": expense},
    )


def generate_spending_insights(user, anchor_date=None, limit=DEFAULT_INSIGHT_LIMIT):
    """Return a bounded list of observations for one user's calendar month."""

    if not 1 <= limit <= MAX_INSIGHT_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_INSIGHT_LIMIT}.")

    anchor_date = anchor_date or timezone.localdate()
    start_date, end_date = get_month_range(anchor_date)
    previous_anchor = start_date - timedelta(days=1)
    current_spend = calculate_category_spend(user, anchor_date)
    current_summary = calculate_monthly_summary(user, anchor_date)

    if current_summary["transaction_count"] == 0:
        no_activity = SpendingInsight(
            type="no_activity",
            title="No activity to analyze",
            message=f"No transactions are recorded for {start_date:%B}.",
            action=(
                "Add or import transactions to receive personalized spending insights."
            ),
            data={},
        )
        return {
            "period": f"{start_date:%Y-%m}",
            "period_start": start_date,
            "period_end": end_date,
            "insight_count": 1,
            "insights": [no_activity.as_dict()],
        }

    previous_spend = calculate_category_spend(user, previous_anchor)
    insights = []

    top_category = _top_category_insight(current_spend, f"{start_date:%B}")
    if top_category is not None:
        insights.append(top_category)

    insights.extend(
        _increase_insights(
            current_spend,
            previous_spend,
            f"{previous_anchor:%B}",
        )
    )
    insights.append(_savings_insight(current_summary, f"{start_date:%B}"))
    serialized_insights = [insight.as_dict() for insight in insights[:limit]]

    return {
        "period": f"{start_date:%Y-%m}",
        "period_start": start_date,
        "period_end": end_date,
        "insight_count": len(serialized_insights),
        "insights": serialized_insights,
    }


# Readable compatibility alias for callers that prefer a query-style name.
get_spending_insights = generate_spending_insights


__all__ = [
    "DEFAULT_INSIGHT_LIMIT",
    "MAX_INSIGHT_LIMIT",
    "SpendingInsight",
    "generate_spending_insights",
    "get_spending_insights",
]
