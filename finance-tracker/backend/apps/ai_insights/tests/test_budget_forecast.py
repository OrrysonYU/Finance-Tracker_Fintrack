from datetime import date, datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_insights.services.budget_forecast import calculate_budget_forecast
from budgets.models import Budget, BudgetItem
from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class BudgetForecastServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="forecast_owner",
            email="forecast@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="forecast_other",
            email="other-forecast@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Main",
            currency="KES",
        )
        self.other_account = Account.objects.create(
            user=self.other_user,
            name="Other",
            currency="KES",
        )
        self.groceries = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.transport = Category.objects.create(
            name="Transport",
            category_type=Category.Type.EXPENSE,
        )
        self.budget = Budget.objects.create(
            user=self.user,
            name="July plan",
            period=Budget.Period.CUSTOM,
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 31),
        )
        self.grocery_item = BudgetItem.objects.create(
            budget=self.budget,
            category=self.groceries,
            limit_amount=Decimal("310.00"),
        )

    def timestamp(self, year, month, day):
        return timezone.make_aware(datetime(year, month, day, 12, 0))

    def create_transaction(self, **kwargs):
        return balance_service.create_transaction(account=self.account, **kwargs)

    def test_projects_partial_period_spending_using_inclusive_days(self):
        self.create_transaction(
            amount=Decimal("100.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )

        result = calculate_budget_forecast(self.budget, as_of=date(2026, 7, 10))

        self.assertEqual(result["days"], {"elapsed": 10, "remaining": 21, "total": 31})
        self.assertEqual(result["totals"]["spent_to_date"], Decimal("100.00"))
        self.assertEqual(result["totals"]["run_rate_per_day"], Decimal("10.00"))
        self.assertEqual(result["totals"]["projected_spend"], Decimal("310.00"))
        self.assertEqual(result["totals"]["risk_status"], "on_track")

    def test_marks_a_budget_at_risk_when_projection_exceeds_limit(self):
        self.create_transaction(
            amount=Decimal("200.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )

        result = calculate_budget_forecast(self.budget, as_of=date(2026, 7, 10))

        self.assertEqual(result["totals"]["projected_spend"], Decimal("620.00"))
        self.assertEqual(result["totals"]["projected_usage_percent"], Decimal("200.00"))
        self.assertEqual(result["totals"]["risk_status"], "at_risk")

    def test_marks_already_exceeded_budget_over_budget(self):
        self.create_transaction(
            amount=Decimal("320.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 2),
        )

        result = calculate_budget_forecast(self.budget, as_of=date(2026, 7, 2))

        self.assertEqual(result["totals"]["risk_status"], "over_budget")

    def test_future_and_other_user_transactions_do_not_affect_forecast(self):
        self.create_transaction(
            amount=Decimal("100.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )
        self.create_transaction(
            amount=Decimal("900.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 20),
        )
        balance_service.create_transaction(
            account=self.other_account,
            amount=Decimal("800.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )

        result = calculate_budget_forecast(self.budget, as_of=date(2026, 7, 10))

        self.assertEqual(result["totals"]["spent_to_date"], Decimal("100.00"))

    def test_returns_per_category_and_total_forecasts(self):
        BudgetItem.objects.create(
            budget=self.budget,
            category=self.transport,
            limit_amount=Decimal("155.00"),
        )
        self.create_transaction(
            amount=Decimal("100.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )
        self.create_transaction(
            amount=Decimal("25.00"),
            category=self.transport,
            timestamp=self.timestamp(2026, 7, 10),
        )

        result = calculate_budget_forecast(self.budget, as_of=date(2026, 7, 10))

        self.assertEqual(len(result["items"]), 2)
        self.assertEqual(result["totals"]["limit"], Decimal("465.00"))
        self.assertEqual(result["totals"]["spent_to_date"], Decimal("125.00"))
        self.assertEqual(result["totals"]["projected_spend"], Decimal("387.50"))

    def test_not_started_and_completed_periods_are_not_extrapolated(self):
        self.create_transaction(
            amount=Decimal("100.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 10),
        )

        before = calculate_budget_forecast(self.budget, as_of=date(2026, 6, 30))
        after = calculate_budget_forecast(self.budget, as_of=date(2026, 8, 5))

        self.assertEqual(before["totals"]["projected_spend"], Decimal("0.00"))
        self.assertEqual(before["totals"]["risk_status"], "not_started")
        self.assertEqual(after["totals"]["projected_spend"], Decimal("100.00"))
        self.assertEqual(after["totals"]["risk_status"], "on_track")


@override_settings(
    AI_INSIGHTS_ENABLED=True,
    PASSWORD_HASHERS=FAST_PASSWORD_HASHERS,
)
class BudgetForecastApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="forecast_api_owner",
            email="forecast-api@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="forecast_api_other",
            email="other-forecast-api@example.com",
            password="StrongPass123!",
        )
        self.budget = Budget.objects.create(
            user=self.user,
            name="July plan",
            period=Budget.Period.CUSTOM,
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 31),
        )
        self.other_budget = Budget.objects.create(
            user=self.other_user,
            name="Private plan",
            period=Budget.Period.CUSTOM,
            start_date=date(2026, 7, 1),
            end_date=date(2026, 7, 31),
        )
        self.url = reverse(
            "ai_insights:budget-forecast",
            kwargs={"budget_id": self.budget.id},
        )

    def test_owner_can_request_forecast_for_an_as_of_date(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, {"as_of": "2026-07-10"})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["range"]["as_of"], date(2026, 7, 10))
        self.assertEqual(response.data["budget"]["id"], self.budget.id)

    def test_endpoint_requires_authentication_and_valid_date(self):
        unauthenticated = self.client.get(self.url)
        self.client.force_authenticate(self.user)
        invalid_date = self.client.get(self.url, {"as_of": "07/10/2026"})

        self.assertEqual(unauthenticated.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(invalid_date.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_cannot_access_another_users_forecast(self):
        self.client.force_authenticate(self.user)
        private_url = reverse(
            "ai_insights:budget-forecast",
            kwargs={"budget_id": self.other_budget.id},
        )

        response = self.client.get(private_url, {"as_of": "2026-07-10"})

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_disabled_feature_returns_service_unavailable(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "disabled")
