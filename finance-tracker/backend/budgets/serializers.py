from django.db import transaction
from django.db.models import Q
from rest_framework import serializers

from budgets.models import Budget, BudgetItem
from finance.models import Category


class BudgetItemSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=Category.objects.none())
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = BudgetItem
        fields = [
            "id",
            "category",
            "category_name",
            "limit_amount",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "category_name", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return

        self.fields["category"].queryset = Category.objects.filter(
            Q(user=user) | Q(user__isnull=True),
            category_type=Category.Type.EXPENSE,
            is_active=True,
        )

    def validate_limit_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError(
                "Budget item limit must be greater than zero."
            )
        return value


class BudgetSerializer(serializers.ModelSerializer):
    items = BudgetItemSerializer(many=True, required=False)

    class Meta:
        model = Budget
        fields = [
            "id",
            "name",
            "period",
            "start_date",
            "end_date",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return

        category_field = self.fields["items"].child.fields["category"]
        category_field.queryset = Category.objects.filter(
            Q(user=user) | Q(user__isnull=True),
            category_type=Category.Type.EXPENSE,
            is_active=True,
        )

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Budget name is required.")
        return value

    def validate(self, attrs):
        period = attrs.get(
            "period",
            getattr(self.instance, "period", Budget.Period.MONTH),
        )
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))

        if period == Budget.Period.CUSTOM and (not start_date or not end_date):
            raise serializers.ValidationError(
                {"end_date": "Custom budgets require both start and end dates."}
            )

        if start_date and end_date and start_date > end_date:
            raise serializers.ValidationError(
                {"end_date": "Budget end date must be on or after the start date."}
            )

        items = attrs.get("items")
        if items is not None:
            category_ids = [item["category"].id for item in items]
            if len(category_ids) != len(set(category_ids)):
                raise serializers.ValidationError(
                    {"items": "Each category can only appear once per budget."}
                )

        return attrs

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        budget = Budget.objects.create(**validated_data)
        self._replace_items(budget, items_data)
        return budget

    @transaction.atomic
    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            self._replace_items(instance, items_data)

        return instance

    def _replace_items(self, budget, items_data):
        for item_data in items_data:
            BudgetItem.objects.create(budget=budget, **item_data)


class BudgetUtilizationItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    category = serializers.IntegerField()
    category_name = serializers.CharField()
    limit_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    usage_percent = serializers.DecimalField(max_digits=7, decimal_places=2)
    is_over_budget = serializers.BooleanField()


class BudgetUtilizationBudgetSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    period = serializers.CharField()


class BudgetUtilizationRangeSerializer(serializers.Serializer):
    start = serializers.DateField()
    end = serializers.DateField()


class BudgetUtilizationTotalsSerializer(serializers.Serializer):
    limit = serializers.DecimalField(max_digits=12, decimal_places=2)
    spent = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2)
    usage_percent = serializers.DecimalField(max_digits=7, decimal_places=2)
    is_over_budget = serializers.BooleanField()


class BudgetUtilizationSerializer(serializers.Serializer):
    budget = BudgetUtilizationBudgetSerializer()
    range = BudgetUtilizationRangeSerializer()
    items = BudgetUtilizationItemSerializer(many=True)
    totals = BudgetUtilizationTotalsSerializer()
