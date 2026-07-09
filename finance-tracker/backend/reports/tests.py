from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class ReportApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="report_owner",
            email="reports@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="report_other",
            email="other-reports@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Main Wallet",
            type=Account.Type.CASH,
            currency="KES",
        )
        self.other_account = Account.objects.create(
            user=self.other_user,
            name="Other Wallet",
            type=Account.Type.CASH,
            currency="KES",
        )
        self.salary = Category.objects.create(
            name="Salary",
            category_type=Category.Type.INCOME,
        )
        self.groceries = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.transport = Category.objects.create(
            name="Transport",
            category_type=Category.Type.EXPENSE,
        )
        self.current_month = timezone.localtime(timezone.now()).replace(
            day=1,
            hour=12,
            minute=0,
            second=0,
            microsecond=0,
        )
        self.previous_month = self.current_month - timedelta(days=1)

    def amount(self, value):
        return Decimal(str(value)).quantize(Decimal("0.01"))

    def create_transaction(self, **kwargs):
        return balance_service.create_transaction(account=self.account, **kwargs)

    def test_monthly_summary_uses_current_month_and_user_scope(self):
        self.create_transaction(
            category=self.salary,
            amount=Decimal("500.00"),
            is_credit=True,
            description="Current salary",
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.groceries,
            amount=Decimal("120.00"),
            is_credit=False,
            description="Current groceries",
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.transport,
            amount=Decimal("30.00"),
            is_credit=False,
            description="Current transport",
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.groceries,
            amount=Decimal("80.00"),
            is_credit=False,
            description="Previous groceries",
            timestamp=self.previous_month,
        )
        balance_service.create_transaction(
            account=self.other_account,
            category=self.groceries,
            amount=Decimal("999.00"),
            is_credit=False,
            description="Other user spend",
            timestamp=self.current_month,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/reports/monthly-summary/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.amount(response.data["income"]), Decimal("500.00"))
        self.assertEqual(self.amount(response.data["expense"]), Decimal("150.00"))
        self.assertEqual(self.amount(response.data["net"]), Decimal("350.00"))
        self.assertEqual(response.data["transaction_count"], 3)

    def test_category_spend_groups_current_month_expenses(self):
        self.create_transaction(
            category=self.groceries,
            amount=Decimal("120.00"),
            is_credit=False,
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.transport,
            amount=Decimal("30.00"),
            is_credit=False,
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.salary,
            amount=Decimal("500.00"),
            is_credit=True,
            timestamp=self.current_month,
        )
        self.create_transaction(
            category=self.groceries,
            amount=Decimal("80.00"),
            is_credit=False,
            timestamp=self.previous_month,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/reports/category-spend/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.amount(response.data["total"]), Decimal("150.00"))
        self.assertEqual(
            {
                name: self.amount(value)
                for name, value in response.data["by_category"].items()
            },
            {
                "Groceries": Decimal("120.00"),
                "Transport": Decimal("30.00"),
            },
        )

    def test_legacy_category_route_still_works_for_current_dashboard(self):
        self.create_transaction(
            category=self.groceries,
            amount=Decimal("25.00"),
            is_credit=False,
            timestamp=self.current_month,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get("/api/reports/reports/by-category/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(self.amount(response.data["total"]), Decimal("25.00"))
