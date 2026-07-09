from decimal import Decimal

from django.db.models import Sum

from finance.models import Transaction
from reports.services.monthly_summary import get_month_range, money


def calculate_category_spend(user, anchor_date=None):
    """Calculate current-month expense totals grouped by category."""
    start_date, end_date = get_month_range(anchor_date)
    rows = (
        Transaction.objects.filter(
            account__user=user,
            is_credit=False,
            timestamp__date__gte=start_date,
            timestamp__date__lte=end_date,
        )
        .values("category_id", "category__name")
        .annotate(total=Sum("amount"))
        .order_by("-total", "category__name")
    )

    categories = []
    by_category = {}
    total_spend = Decimal("0.00")

    for row in rows:
        category_name = row["category__name"] or "Uncategorized"
        total = money(row["total"])
        total_spend += total
        by_category[category_name] = money(
            by_category.get(category_name, Decimal("0.00")) + total
        )
        categories.append(
            {
                "category_id": row["category_id"],
                "category_name": category_name,
                "total": total,
            }
        )

    return {
        "period": f"{start_date:%Y-%m}",
        "period_start": start_date,
        "period_end": end_date,
        "total": money(total_spend),
        "by_category": by_category,
        "categories": categories,
    }
