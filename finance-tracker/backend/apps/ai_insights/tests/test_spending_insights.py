from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_insights.services.spending_insights import generate_spending_insights
from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class SpendingInsightServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="insight_owner",
            email="insights@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="insight_other",
            email="other-insights@example.com",
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
        self.salary = Category.objects.create(
            name="Salary",
            category_type=Category.Type.INCOME,
        )
        self.groceries = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.dining = Category.objects.create(
            name="Dining",
            category_type=Category.Type.EXPENSE,
        )

    def timestamp(self, year, month, day):
        return timezone.make_aware(datetime(year, month, day, 12, 0))

    def create_transaction(self, **kwargs):
        return balance_service.create_transaction(account=self.account, **kwargs)

    def test_generates_top_category_increase_and_savings_nudge(self):
        self.create_transaction(
            amount=Decimal("1000.00"),
            category=self.salary,
            is_credit=True,
            timestamp=self.timestamp(2026, 7, 1),
        )
        self.create_transaction(
            amount=Decimal("400.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 5),
        )
        self.create_transaction(
            amount=Decimal("200.00"),
            category=self.dining,
            timestamp=self.timestamp(2026, 7, 8),
        )
        self.create_transaction(
            amount=Decimal("200.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 6, 5),
        )
        self.create_transaction(
            amount=Decimal("250.00"),
            category=self.dining,
            timestamp=self.timestamp(2026, 6, 8),
        )

        result = generate_spending_insights(
            self.user,
            anchor_date=self.timestamp(2026, 7, 15).date(),
        )
        by_type = {insight["type"]: insight for insight in result["insights"]}

        self.assertEqual(result["period"], "2026-07")
        self.assertEqual(
            by_type["top_spending_category"]["data"]["category_name"],
            "Groceries",
        )
        self.assertEqual(
            by_type["top_spending_category"]["data"]["amount"],
            Decimal("400.00"),
        )
        self.assertEqual(
            by_type["month_over_month_increase"]["data"]["increase_percent"],
            Decimal("100.00"),
        )
        self.assertEqual(
            by_type["savings_nudge"]["data"]["surplus"],
            Decimal("400.00"),
        )
        self.assertEqual(
            by_type["savings_nudge"]["data"]["savings_rate_percent"],
            Decimal("40.00"),
        )

    def test_excludes_other_users_transactions(self):
        self.create_transaction(
            amount=Decimal("50.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 5),
        )
        balance_service.create_transaction(
            account=self.other_account,
            amount=Decimal("999.00"),
            category=self.dining,
            timestamp=self.timestamp(2026, 7, 5),
        )

        result = generate_spending_insights(
            self.user,
            anchor_date=self.timestamp(2026, 7, 15).date(),
        )

        top = result["insights"][0]
        self.assertEqual(top["data"]["category_name"], "Groceries")
        self.assertEqual(top["data"]["amount"], Decimal("50.00"))

    def test_new_category_does_not_produce_a_division_by_zero_increase(self):
        self.create_transaction(
            amount=Decimal("75.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 5),
        )

        result = generate_spending_insights(
            self.user,
            anchor_date=self.timestamp(2026, 7, 15).date(),
        )

        self.assertNotIn(
            "month_over_month_increase",
            {insight["type"] for insight in result["insights"]},
        )

    def test_no_activity_returns_a_helpful_observation(self):
        result = generate_spending_insights(
            self.user,
            anchor_date=self.timestamp(2026, 7, 15).date(),
        )

        self.assertEqual(result["insight_count"], 1)
        self.assertEqual(result["insights"][0]["type"], "no_activity")

    def test_limit_bounds_the_number_of_results(self):
        self.create_transaction(
            amount=Decimal("100.00"),
            category=self.groceries,
            timestamp=self.timestamp(2026, 7, 5),
        )

        result = generate_spending_insights(
            self.user,
            anchor_date=self.timestamp(2026, 7, 15).date(),
            limit=1,
        )

        self.assertEqual(result["insight_count"], 1)
        with self.assertRaises(ValueError):
            generate_spending_insights(self.user, limit=0)


@override_settings(
    AI_INSIGHTS_ENABLED=True,
    PASSWORD_HASHERS=FAST_PASSWORD_HASHERS,
)
class SpendingInsightApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="insight_api_owner",
            email="insight-api@example.com",
            password="StrongPass123!",
        )
        self.url = reverse("ai_insights:spending-insights")

    def test_authenticated_user_can_request_a_specific_month(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url, {"year": 2026, "month": 7})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["period"], "2026-07")
        self.assertEqual(response.data["insights"][0]["type"], "no_activity")

    def test_endpoint_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_endpoint_validates_period_and_limit(self):
        self.client.force_authenticate(self.user)

        missing_month = self.client.get(self.url, {"year": 2026})
        invalid_month = self.client.get(self.url, {"year": 2026, "month": 13})
        invalid_limit = self.client.get(self.url, {"limit": 0})

        self.assertEqual(missing_month.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_month.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_limit.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_disabled_feature_returns_service_unavailable(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "disabled")
