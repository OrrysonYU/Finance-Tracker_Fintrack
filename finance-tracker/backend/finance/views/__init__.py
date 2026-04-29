from django.db.models import Q
from django.http import JsonResponse
from rest_framework import permissions, viewsets

from finance.models import Category, SavingGoal, Transaction
from finance.serializers import (
    CategorySerializer,
    SavingGoalSerializer,
    TransactionSerializer,
)
from finance.services import balance_service

from .account import AccountViewSet


def api_root(request):
    return JsonResponse({"message": "Welcome to the Finance API root"})


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["category_type", "is_active"]
    search_fields = ["name"]
    ordering_fields = ["category_type", "name", "id"]

    def get_queryset(self):
        return Category.objects.filter(
            Q(user=self.request.user) | Q(user__isnull=True),
            is_active=True,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["account", "is_credit", "category"]
    search_fields = ["description"]
    ordering_fields = ["timestamp", "amount", "id"]

    def get_queryset(self):
        return Transaction.objects.filter(account__user=self.request.user)

    def perform_create(self, serializer):
        ledger_entry = balance_service.create_transaction(**serializer.validated_data)
        serializer.instance = ledger_entry

    def perform_update(self, serializer):
        ledger_entry = balance_service.update_transaction(
            serializer.instance,
            **serializer.validated_data,
        )
        serializer.instance = ledger_entry

    def perform_destroy(self, instance):
        balance_service.delete_transaction(instance)


class SavingGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingGoalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["deadline"]
    search_fields = ["name"]
    ordering_fields = ["target_amount", "current_amount", "deadline", "id"]

    def get_queryset(self):
        return SavingGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


__all__ = [
    "AccountViewSet",
    "CategoryViewSet",
    "SavingGoalViewSet",
    "TransactionViewSet",
    "api_root",
]
