from rest_framework import permissions, viewsets

from finance.models import SavingGoal
from finance.serializers.goal import SavingGoalSerializer


class SavingGoalViewSet(viewsets.ModelViewSet):
    serializer_class = SavingGoalSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["currency", "deadline"]
    search_fields = ["name", "description"]
    ordering_fields = [
        "target_amount",
        "current_amount",
        "deadline",
        "created_at",
        "updated_at",
        "id",
    ]
    ordering = ["deadline", "name"]

    def get_queryset(self):
        return SavingGoal.objects.filter(user=self.request.user).order_by(
            "deadline",
            "name",
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
