from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import Account, Category, Transaction
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
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


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class TransactionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="transaction_owner",
            email="transactions@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="transaction_other",
            email="other-transactions@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Everyday Wallet",
            type=Account.Type.CASH,
            currency="KES",
            opening_balance=Decimal("100.00"),
        )
        self.secondary_account = Account.objects.create(
            user=self.user,
            name="Bank Account",
            type=Account.Type.BANK,
            currency="KES",
            opening_balance=Decimal("200.00"),
        )
        self.other_account = Account.objects.create(
            user=self.other_user,
            name="Other Wallet",
            type=Account.Type.CASH,
            currency="KES",
        )
        self.income_category = Category.objects.create(
            name="Salary",
            category_type=Category.Type.INCOME,
        )
        self.expense_category = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.transfer_category = Category.objects.create(
            name="Transfer",
            category_type=Category.Type.TRANSFER,
        )
        self.other_category = Category.objects.create(
            user=self.other_user,
            name="Private Expense",
            category_type=Category.Type.EXPENSE,
        )
        balance_service.sync_account_balance(self.account)
        balance_service.sync_account_balance(self.secondary_account)
        self.url = "/api/finance/transactions/"

    def results(self, response):
        return response.data["results"]

    def create_transaction(self, payload):
        return self.client.post(self.url, payload, format="json")

    def test_user_can_create_list_filter_search_and_order_transactions(self):
        self.client.force_authenticate(self.user)

        income_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.income_category.id,
                "amount": "50.00",
                "is_credit": True,
                "description": "April salary",
            }
        )
        grocery_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.expense_category.id,
                "amount": "25.00",
                "is_credit": False,
                "description": "Groceries",
            }
        )
        transport_response = self.create_transaction(
            {
                "account": self.secondary_account.id,
                "category": self.expense_category.id,
                "amount": "5.00",
                "is_credit": False,
                "description": "Bus fare",
            }
        )

        self.assertEqual(income_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(grocery_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(transport_response.status_code, status.HTTP_201_CREATED)

        account_response = self.client.get(f"/api/finance/accounts/{self.account.id}/")
        self.assertEqual(account_response.data["balance"], "125.00")

        list_response = self.client.get(self.url)
        self.assertEqual(len(self.results(list_response)), 3)

        account_filter_response = self.client.get(
            self.url,
            {"account": self.account.id},
        )
        self.assertEqual(len(self.results(account_filter_response)), 2)

        category_filter_response = self.client.get(
            self.url,
            {"category": self.expense_category.id},
        )
        self.assertEqual(len(self.results(category_filter_response)), 2)

        search_response = self.client.get(self.url, {"search": "salary"})
        self.assertEqual(len(self.results(search_response)), 1)
        self.assertEqual(self.results(search_response)[0]["id"], income_response.data["id"])

        ordering_response = self.client.get(self.url, {"ordering": "amount"})
        ordered_amounts = [item["amount"] for item in self.results(ordering_response)]
        self.assertEqual(ordered_amounts, ["5.00", "25.00", "50.00"])

    def test_user_only_sees_their_own_transactions(self):
        own_transaction = balance_service.create_transaction(
            account=self.account,
            category=self.expense_category,
            amount=Decimal("10.00"),
            is_credit=False,
            description="Own transaction",
        )
        other_transaction = balance_service.create_transaction(
            account=self.other_account,
            category=self.other_category,
            amount=Decimal("10.00"),
            is_credit=False,
            description="Other transaction",
        )

        self.client.force_authenticate(self.user)
        list_response = self.client.get(self.url)
        detail_response = self.client.get(f"{self.url}{other_transaction.id}/")

        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual([item["id"] for item in self.results(list_response)], [own_transaction.id])
        self.assertEqual(detail_response.status_code, status.HTTP_404_NOT_FOUND)

    def test_transaction_create_rejects_invalid_account_or_category_scope(self):
        self.client.force_authenticate(self.user)

        other_account_response = self.create_transaction(
            {
                "account": self.other_account.id,
                "category": self.expense_category.id,
                "amount": "10.00",
                "is_credit": False,
                "description": "Invalid account",
            }
        )
        other_category_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.other_category.id,
                "amount": "10.00",
                "is_credit": False,
                "description": "Invalid category",
            }
        )

        self.assertEqual(other_account_response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(other_category_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_transaction_category_must_match_direction(self):
        self.client.force_authenticate(self.user)

        income_with_expense_category = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.expense_category.id,
                "amount": "10.00",
                "is_credit": True,
                "description": "Wrong direction",
            }
        )
        expense_with_income_category = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.income_category.id,
                "amount": "10.00",
                "is_credit": False,
                "description": "Wrong direction",
            }
        )
        transfer_category_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.transfer_category.id,
                "amount": "10.00",
                "is_credit": False,
                "description": "Transfer without workflow",
            }
        )

        self.assertEqual(
            income_with_expense_category.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            expense_with_income_category.status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(transfer_category_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_deleting_transaction_recalculates_account_balance(self):
        self.client.force_authenticate(self.user)
        income_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.income_category.id,
                "amount": "50.00",
                "is_credit": True,
                "description": "Income",
            }
        )
        expense_response = self.create_transaction(
            {
                "account": self.account.id,
                "category": self.expense_category.id,
                "amount": "20.00",
                "is_credit": False,
                "description": "Expense",
            }
        )

        self.assertEqual(income_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(expense_response.status_code, status.HTTP_201_CREATED)

        delete_response = self.client.delete(f"{self.url}{expense_response.data['id']}/")
        account_response = self.client.get(f"/api/finance/accounts/{self.account.id}/")

        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(account_response.data["balance"], "150.00")

