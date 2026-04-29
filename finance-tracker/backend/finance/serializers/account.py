from rest_framework import serializers

from finance.models import Account


class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = [
            "id",
            "name",
            "type",
            "currency",
            "balance",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["balance", "created_at", "updated_at"]

    def validate_name(self, value):
        name = value.strip()
        if not name:
            raise serializers.ValidationError("Account name is required.")
        return name

    def validate_currency(self, value):
        currency = value.strip().upper()
        if len(currency) != 3:
            raise serializers.ValidationError(
                "Currency must be a three-letter ISO 4217 code."
            )
        return currency
