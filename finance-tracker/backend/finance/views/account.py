from rest_framework import permissions, viewsets

from finance.models import Account
from finance.serializers.account import AccountSerializer
from finance.services import balance_service


class AccountViewSet(viewsets.ModelViewSet):
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ["type", "currency"]
    search_fields = ["name"]
    ordering_fields = ["name", "opening_balance", "balance", "created_at", "id"]

    def get_queryset(self):
        return Account.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        account = serializer.save(user=self.request.user)
        balance_service.sync_account_balance(account)

    def perform_update(self, serializer):
        account = serializer.save()
        balance_service.sync_account_balance(account)
