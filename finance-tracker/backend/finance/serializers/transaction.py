from django.db.models import Q
from rest_framework import serializers

from finance.models import Account, Category, Transaction
from finance.services import balance_service


class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.none())
    account_name = serializers.CharField(source="account.name", read_only=True)
    category = serializers.PrimaryKeyRelatedField(
        allow_null=True,
        queryset=Category.objects.none(),
        required=False,
    )
    category_name = serializers.CharField(source="category.name", read_only=True)
    category_type = serializers.CharField(source="category.category_type", read_only=True)
    signed_amount = serializers.SerializerMethodField()

    class Meta:
        model = Transaction
        fields = [
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "category_type",
            "amount",
            "signed_amount",
            "is_credit",
            "description",
            "timestamp",
            "updated_at",
        ]
        read_only_fields = [
            "account_name",
            "category_name",
            "category_type",
            "signed_amount",
            "updated_at",
        ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return

        self.fields["account"].queryset = Account.objects.filter(user=user)
        self.fields["category"].queryset = Category.objects.filter(
            Q(user=user) | Q(user__isnull=True),
            is_active=True,
        )

    def get_signed_amount(self, obj):
        return balance_service.get_signed_amount(obj.amount, obj.is_credit)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Transaction amount must be greater than zero.")
        return value

    def validate(self, attrs):
        account = attrs.get("account") or getattr(self.instance, "account", None)
        category = attrs.get("category")
        is_credit = attrs.get(
            "is_credit",
            getattr(self.instance, "is_credit", False),
        )

        if "category" not in attrs and self.instance:
            category = self.instance.category

        request = self.context.get("request")
        user = getattr(request, "user", None)

        if user and account and account.user_id != user.id:
            raise serializers.ValidationError(
                {"account": "You can only use accounts that belong to you."}
            )

        if category is None:
            return attrs

        if category.user_id not in [None, getattr(user, "id", None)]:
            raise serializers.ValidationError(
                {"category": "You can only use default categories or your own categories."}
            )

        if not category.is_active:
            raise serializers.ValidationError({"category": "Category is not active."})

        if category.category_type == Category.Type.TRANSFER:
            raise serializers.ValidationError(
                {"category": "Transfer categories require a dedicated transfer workflow."}
            )

        expected_type = Category.Type.INCOME if is_credit else Category.Type.EXPENSE
        if category.category_type != expected_type:
            direction = "income" if is_credit else "expense"
            raise serializers.ValidationError(
                {"category": f"Use a {direction} category for this transaction."}
            )

        return attrs
