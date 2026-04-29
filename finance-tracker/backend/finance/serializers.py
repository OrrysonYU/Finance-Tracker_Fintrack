from rest_framework import serializers
from .models import Account, Transaction, SavingGoal, Category


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


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = "__all__"
        read_only_fields = ["user", "balance"]  # balance will be maintained by signals


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = "__all__"

    def validate(self, data):
        # Ensure user only touches own account
        request = self.context.get("request")
        if request and data.get("account") and data["account"].user != request.user:
            raise serializers.ValidationError("You can only add transactions to your own accounts.")
        return data


class SavingGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavingGoal
        fields = "__all__"
        read_only_fields = ["user", "current_amount"]
