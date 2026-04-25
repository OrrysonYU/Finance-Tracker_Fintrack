from django.db.models import Q
from rest_framework import viewsets, permissions
from django.http import JsonResponse

from .models import Account, Transaction, SavingGoal, Category
from .serializers import (
    AccountSerializer,
    TransactionSerializer,
    SavingGoalSerializer,
    CategorySerializer,
)


def api_root(request):
    return JsonResponse({"message": "Welcome to the Finance API root"})


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    search_fields = ["name"]
    ordering_fields = ["name", "id"]

    def get_queryset(self):
        # user-specific + global categories
        return Category.objects.filter(Q(user=self.request.user) | Q(user__isnull=True))

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["type", "currency"]
    search_fields = ["name"]
    ordering_fields = ["name", "balance", "id"]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

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
