from rest_framework import serializers

from finance.models import Category

from .account import AccountSerializer
from .goal import SavingGoalSerializer
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


__all__ = [
    "AccountSerializer",
    "CategorySerializer",
    "SavingGoalSerializer",
    "TransactionSerializer",
]
