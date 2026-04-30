import django_filters
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import Q
from rest_framework import permissions, viewsets
from rest_framework.exceptions import ValidationError as ApiValidationError

from finance.models import Account, Category, Transaction
from finance.serializers.transaction import TransactionSerializer
from finance.services import balance_service


def _as_api_validation_error(exc):
    if hasattr(exc, "message_dict"):
        return ApiValidationError(exc.message_dict)
    return ApiValidationError(exc.messages)


class TransactionFilter(django_filters.FilterSet):
    start_date = django_filters.IsoDateTimeFilter(
        field_name="timestamp",
        lookup_expr="gte",
    )
    end_date = django_filters.IsoDateTimeFilter(
        field_name="timestamp",
        lookup_expr="lte",
    )
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")
    category_type = django_filters.ChoiceFilter(
        field_name="category__category_type",
        choices=Category.Type.choices,
    )

    class Meta:
        model = Transaction
        fields = ["account", "category", "is_credit"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        user = getattr(getattr(self, "request", None), "user", None)
        if not user or not user.is_authenticated:
            return

        visible_categories = Category.objects.filter(
            Q(user=user) | Q(user__isnull=True),
            is_active=True,
        )
        self.filters["account"].queryset = Account.objects.filter(user=user)
        self.filters["category"].queryset = visible_categories


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_class = TransactionFilter
    search_fields = ["description", "account__name", "category__name"]
    ordering_fields = ["timestamp", "amount", "updated_at", "id"]
    ordering = ["-timestamp", "-id"]

    def get_queryset(self):
        return (
            Transaction.objects.select_related("account", "category")
            .filter(account__user=self.request.user)
            .order_by("-timestamp", "-id")
        )

    def perform_create(self, serializer):
        try:
            ledger_entry = balance_service.create_transaction(**serializer.validated_data)
        except DjangoValidationError as exc:
            raise _as_api_validation_error(exc)
        serializer.instance = ledger_entry

    def perform_update(self, serializer):
        try:
            ledger_entry = balance_service.update_transaction(
                serializer.instance,
                **serializer.validated_data,
            )
        except DjangoValidationError as exc:
            raise _as_api_validation_error(exc)
        serializer.instance = ledger_entry

    def perform_destroy(self, instance):
        balance_service.delete_transaction(instance)
