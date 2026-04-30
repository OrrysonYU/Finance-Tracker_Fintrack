from rest_framework import serializers

from finance.models import Category, SavingGoal

from .account import AccountSerializer
from .transaction import TransactionSerializer


class CategorySerializer(serializers.ModelSerializer):
    is_default = serializers.ReadOnlyField()

    class Meta:
        model = Category
        fields = [
            "id",
            "name",
            "slug",
            "category_type",
            "is_default",
            "is_active",
        ]
        read_only_fields = ["slug", "is_default"]


class SavingGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingGoal
        fields = "__all__"
        read_only_fields = ["user", "current_amount"]


__all__ = [
    "AccountSerializer",
    "CategorySerializer",
    "SavingGoalSerializer",
    "TransactionSerializer",
]
