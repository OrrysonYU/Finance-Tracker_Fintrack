from rest_framework import serializers
from .models import Budget, BudgetItem

class BudgetItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetItem
        fields = ["id", "category", "limit_amount"]

class BudgetSerializer(serializers.ModelSerializer):
    items = BudgetItemSerializer(many=True)

    class Meta:
        model = Budget
        fields = ["id", "name", "period", "start_date", "end_date", "items"]

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        budget = Budget.objects.create(**validated_data)
        for item in items_data:
            BudgetItem.objects.create(budget=budget, **item)
        return budget

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", [])
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.save()

        if items_data:
            instance.items.all().delete()
            for item in items_data:
                BudgetItem.objects.create(budget=instance, **item)
        return instance
