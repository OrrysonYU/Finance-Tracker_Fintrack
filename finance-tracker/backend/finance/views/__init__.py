from django.db.models import Q
from django.http import JsonResponse
from rest_framework import permissions, viewsets

from finance.models import Category
from finance.serializers import CategorySerializer

from .account import AccountViewSet
from .goal import SavingGoalViewSet
from .transaction import TransactionViewSet


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


__all__ = [
    "AccountViewSet",
    "CategoryViewSet",
    "SavingGoalViewSet",
    "TransactionViewSet",
    "api_root",
]
