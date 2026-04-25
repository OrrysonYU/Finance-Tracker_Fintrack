from datetime import date
from django.db.models import Sum, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, response
from finance.models import Transaction


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def monthly_summary(request):
    """Totals for current month: income, expense, net."""
    today = date.today()
    start = date(today.year, today.month, 1)
    # safe lower bound for end-of-month; covers 28-31
    if today.month == 12:
        end = date(today.year, 12, 31)
    else:
        from datetime import timedelta
        end = date(today.year, today.month + 1, 1) - timedelta(days=1)

    income = Transaction.objects.filter(
        account__user=request.user, is_credit=True,
        timestamp__date__gte=start, timestamp__date__lte=end,
    ).aggregate(s=Sum("amount"))["s"] or 0

    expense = Transaction.objects.filter(
        account__user=request.user, is_credit=False,
        timestamp__date__gte=start, timestamp__date__lte=end,
    ).aggregate(s=Sum("amount"))["s"] or 0

    return response.Response({
        "period": f"{today.year}-{today.month:02d}",
        "income": float(income),
        "expense": float(expense),
        "net": float(income) - float(expense),
    })


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def by_category(request):
    """Spend by category (all time)."""
    qs = Transaction.objects.filter(account__user=request.user, is_credit=False)
    data = {}
    for t in qs.select_related("category"):
        key = t.category.name if t.category else "Uncategorized"
        data[key] = data.get(key, 0) + float(t.amount)
    return response.Response({"by_category": data})
