from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import decorators, permissions, response, viewsets
from rest_framework.exceptions import ValidationError as ApiValidationError

from budgets.models import Budget
from budgets.serializers import BudgetSerializer, BudgetUtilizationSerializer
from budgets.services.utilization_service import calculate_budget_utilization


def _as_api_validation_error(exc):
    if hasattr(exc, "message_dict"):
        return ApiValidationError(exc.message_dict)
    return ApiValidationError(exc.messages)


class BudgetViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetSerializer
    permission_classes = [permissions.IsAuthenticated]
    ordering_fields = ["name", "period", "start_date", "end_date", "created_at"]
    ordering = ["-created_at", "name"]
    search_fields = ["name", "items__category__name"]

    def get_queryset(self):
        return (
            Budget.objects.prefetch_related("items__category")
            .filter(user=self.request.user)
            .order_by("-created_at", "name")
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @decorators.action(detail=True, methods=["get"])
    def utilization(self, request, pk=None):
        budget = self.get_object()
        try:
            utilization = calculate_budget_utilization(budget)
        except DjangoValidationError as exc:
            raise _as_api_validation_error(exc)

        serializer = BudgetUtilizationSerializer(utilization)
        return response.Response(serializer.data)
