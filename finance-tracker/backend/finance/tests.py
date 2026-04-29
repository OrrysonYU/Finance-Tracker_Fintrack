from decimal import Decimal

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import Account, Transaction
from finance.services import balance_service


User = get_user_model()


class AccountApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="account_owner",
            email="owner@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="account_other",
            email="other@example.com",
            password="StrongPass123!",
        )
        self.url = "/api/finance/accounts/"

    def test_authenticated_user_can_create_account_without_setting_balance(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url,
            {
                "name": "Everyday Wallet",
                "type": Account.Type.CASH,
                "currency": "usd",
                "balance": "9999.99",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Everyday Wallet")
        self.assertEqual(response.data["currency"], "USD")
        self.assertEqual(response.data["balance"], "0.00")

        account = Account.objects.get(id=response.data["id"])
        self.assertEqual(account.user, self.user)
        self.assertEqual(account.balance, 0)
        self.assertEqual(account.opening_balance, 0)

    def test_user_only_lists_their_own_accounts(self):
        owner_account = Account.objects.create(
            user=self.user,
            name="Owner Bank",
            type=Account.Type.BANK,
            currency="KES",
        )
        Account.objects.create(
            user=self.other_user,
            name="Other Bank",
            type=Account.Type.BANK,
            currency="KES",
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], owner_account.id)

    def test_user_cannot_retrieve_another_users_account(self):
        other_account = Account.objects.create(
            user=self.other_user,
            name="Private Account",
            type=Account.Type.BANK,
            currency="KES",
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(f"{self.url}{other_account.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class BalanceServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="ledger_owner",
            email="ledger@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Main Wallet",
            type=Account.Type.CASH,
            currency="KES",
            opening_balance=Decimal("100.00"),
        )
        balance_service.sync_account_balance(self.account)

    def test_income_and_expense_transactions_update_balance_explicitly(self):
        balance_service.create_transaction(
            account=self.account,
            amount=Decimal("50.00"),
            is_credit=True,
            description="Salary top-up",
        )
        balance_service.create_transaction(
            account=self.account,
            amount=Decimal("20.00"),
            is_credit=False,
            description="Groceries",
        )

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("130.00"))

    def test_direct_transaction_save_does_not_mutate_balance_without_service(self):
        Transaction.objects.create(
            account=self.account,
            amount=Decimal("25.00"),
            is_credit=True,
            description="Direct insert",
        )

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("100.00"))

        balance_service.sync_account_balance(self.account)

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("125.00"))

    def test_transaction_update_and_delete_recalculate_balance(self):
        ledger_entry = balance_service.create_transaction(
            account=self.account,
            amount=Decimal("30.00"),
            is_credit=False,
            description="Original expense",
        )

        balance_service.update_transaction(
            ledger_entry,
            amount=Decimal("10.00"),
            is_credit=False,
            description="Corrected expense",
        )

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("90.00"))

        balance_service.delete_transaction(ledger_entry)

        self.account.refresh_from_db()
        self.assertEqual(self.account.balance, Decimal("100.00"))
