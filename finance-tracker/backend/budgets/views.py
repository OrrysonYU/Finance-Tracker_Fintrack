from datetime import date
from django.db.models import Sum, Q, F
from rest_framework import viewsets, permissions, decorators, response
from .models import Budget, BudgetItem
from .serializers import BudgetSerializer
from finance.models import Transaction


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @decorators.action(detail=True, methods=["get"])
    def utilization(self, request, pk=None):
        budget = self.get_object()
        # derive date range
        if budget.period == "MONTH":
            today = date.today()
            start = date(today.year, today.month, 1)
            # end-of-month
            if today.month == 12:
                end = date(today.year, 12, 31)
            else:
                from datetime import timedelta
                end = date(today.year, today.month + 1, 1) - timedelta(days=1)
        elif budget.period == "YEAR":
            today = date.today()
            start = date(today.year, 1, 1)
            end = date(today.year, 12, 31)
        else:
            start = budget.start_date
            end = budget.end_date

        # sum expenses per category in range
        items = []
        total_limit = 0
        total_spent = 0

        for item in budget.items.select_related("category").all():
            spent = Transaction.objects.filter(
                account__user=request.user,
                category=item.category,
                is_credit=False,
                timestamp__date__gte=start,
                timestamp__date__lte=end,
            ).aggregate(s=Sum("amount"))["s"] or 0
            items.append({
                "category": item.category.name,
                "limit_amount": float(item.limit_amount),
                "spent": float(spent),
                "remaining": float(item.limit_amount) - float(spent)
            })
            total_limit += float(item.limit_amount)
            total_spent += float(spent)

        return response.Response({
            "budget": {"id": budget.id, "name": budget.name, "period": budget.period},
            "range": {"start": str(start), "end": str(end)},
            "items": items,
            "totals": {
                "limit": total_limit,
                "spent": total_spent,
                "remaining": total_limit - total_spent
            }
        })
