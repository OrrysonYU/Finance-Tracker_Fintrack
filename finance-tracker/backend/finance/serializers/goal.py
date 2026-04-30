from django.utils import timezone
from rest_framework import serializers

from finance.models import SavingGoal


class SavingGoalSerializer(serializers.ModelSerializer):
    progress_percent = serializers.DecimalField(
        max_digits=5,
        decimal_places=2,
        read_only=True,
    )
    remaining_amount = serializers.DecimalField(
        max_digits=12,
        decimal_places=2,
        read_only=True,
    )
    is_completed = serializers.BooleanField(read_only=True)

    class Meta:
        model = SavingGoal
        fields = [
            "id",
            "name",
            "description",
            "currency",
            "target_amount",
            "current_amount",
            "remaining_amount",
            "progress_percent",
            "is_completed",
            "deadline",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "remaining_amount",
            "progress_percent",
            "is_completed",
            "created_at",
            "updated_at",
        ]

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Goal name is required.")
        return name

    def validate_currency(self, value):
        currency = value.strip().upper()
        if len(currency) != 3:
            raise serializers.ValidationError(
                "Currency must be a three-letter ISO 4217 code."
            )
        return currency

    def validate_deadline(self, value):
        if value and value < timezone.localdate():
            raise serializers.ValidationError("Deadline cannot be in the past.")
        return value

    def validate(self, attrs):
        target_amount = attrs.get(
            "target_amount",
            getattr(self.instance, "target_amount", None),
        )
        current_amount = attrs.get(
            "current_amount",
            getattr(self.instance, "current_amount", 0),
        )

        if target_amount is not None and target_amount <= 0:
            raise serializers.ValidationError(
                {"target_amount": "Target amount must be greater than zero."}
            )

        if current_amount < 0:
            raise serializers.ValidationError(
                {"current_amount": "Current amount cannot be negative."}
            )

        if target_amount is not None and current_amount > target_amount:
            raise serializers.ValidationError(
                {"current_amount": "Current amount cannot exceed target amount."}
            )

        return attrs
