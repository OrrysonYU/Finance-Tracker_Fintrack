from datetime import date, datetime, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_insights.services.anomaly_detector import detect_anomalies
from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class AnomalyDetectorServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="anomaly_owner",
            email="anomalies@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="anomaly_other",
            email="other-anomalies@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Main",
            currency="KES",
        )
        self.usd_account = Account.objects.create(
            user=self.user,
            name="USD card",
            currency="USD",
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
        self.dining = Category.objects.create(
            name="Dining",
            category_type=Category.Type.EXPENSE,
        )
        self.salary = Category.objects.create(
            name="Salary",
            category_type=Category.Type.INCOME,
        )
        self.anchor = date(2026, 8, 31)

    def timestamp(self, value):
        return timezone.make_aware(
            datetime.combine(value, datetime.min.time())
        ).replace(
            hour=12,
        )

    def create_transaction(self, *, day, account=None, **kwargs):
        return balance_service.create_transaction(
            account=account or self.account,
            timestamp=self.timestamp(day),
            **kwargs,
        )

    def seed_weekly_spending(
        self,
        *,
        category=None,
        amounts=None,
        start=date(2026, 6, 1),
        account=None,
    ):
        category = category or self.groceries
        amounts = amounts or ["50.00"] * 6
        for index, amount in enumerate(amounts):
            self.create_transaction(
                day=start + timedelta(days=index * 7),
                account=account,
                category=category,
                amount=Decimal(amount),
                description="Normal weekly spend",
            )

    def test_extreme_category_outlier_is_flagged_with_explanation(self):
        self.seed_weekly_spending()
        outlier = self.create_transaction(
            day=date(2026, 7, 13),
            category=self.groceries,
            amount=Decimal("500.00"),
            description="Unexpected bulk charge",
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 1)
        anomaly = result["anomalies"][0]
        self.assertEqual(anomaly["transaction_id"], outlier.id)
        self.assertEqual(anomaly["reason"], "category_amount_outlier")
        self.assertEqual(anomaly["severity"], "critical")
        self.assertEqual(anomaly["baseline"]["scope"], "category")
        self.assertEqual(anomaly["baseline"]["sample_size"], 6)
        self.assertEqual(anomaly["baseline"]["mean_amount"], Decimal("50.00"))
        self.assertEqual(anomaly["baseline"]["amount_ratio"], Decimal("10.00"))
        self.assertIn("10.0x", anomaly["explanation"])

    def test_normal_variation_is_not_flagged(self):
        self.seed_weekly_spending(
            amounts=["45.00", "50.00", "55.00", "48.00", "52.00", "49.00"]
        )
        self.create_transaction(
            day=date(2026, 7, 13),
            category=self.groceries,
            amount=Decimal("56.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 0)

    def test_sparse_history_does_not_create_an_unreliable_flag(self):
        self.seed_weekly_spending(amounts=["50.00"] * 4)
        self.create_transaction(
            day=date(2026, 7, 1),
            category=self.groceries,
            amount=Decimal("500.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 0)

    def test_large_amount_in_a_rare_category_uses_overall_baseline(self):
        self.seed_weekly_spending(amounts=["50.00"] * 10)
        outlier = self.create_transaction(
            day=date(2026, 8, 15),
            category=self.dining,
            amount=Decimal("500.00"),
            description="Rare expensive dinner",
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 1)
        anomaly = result["anomalies"][0]
        self.assertEqual(anomaly["transaction_id"], outlier.id)
        self.assertEqual(anomaly["reason"], "rare_category_amount_outlier")
        self.assertEqual(anomaly["baseline"]["scope"], "overall")
        self.assertEqual(anomaly["baseline"]["category_sample_size"], 0)

    def test_other_users_and_credit_transactions_are_excluded(self):
        self.seed_weekly_spending()
        balance_service.create_transaction(
            account=self.other_account,
            timestamp=self.timestamp(date(2026, 7, 13)),
            category=self.groceries,
            amount=Decimal("999.00"),
            description="Other user's expense",
        )
        self.create_transaction(
            day=date(2026, 7, 13),
            category=self.salary,
            amount=Decimal("9999.00"),
            is_credit=True,
            description="Large income",
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 0)
        self.assertEqual(result["transaction_count_analyzed"], 6)

    def test_different_currencies_are_never_compared(self):
        self.seed_weekly_spending(account=self.usd_account, amounts=["10.00"] * 6)
        self.create_transaction(
            day=date(2026, 7, 13),
            account=self.account,
            category=self.groceries,
            amount=Decimal("1000.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 0)

    def test_outlier_does_not_poison_the_baseline_for_later_transactions(self):
        self.seed_weekly_spending()
        first_outlier = self.create_transaction(
            day=date(2026, 7, 13),
            category=self.groceries,
            amount=Decimal("500.00"),
        )
        second_outlier = self.create_transaction(
            day=date(2026, 7, 20),
            category=self.groceries,
            amount=Decimal("450.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(
            {anomaly["transaction_id"] for anomaly in result["anomalies"]},
            {first_outlier.id, second_outlier.id},
        )
        self.assertTrue(
            all(
                anomaly["baseline"]["mean_amount"] == Decimal("50.00")
                for anomaly in result["anomalies"]
            )
        )

    def test_as_of_date_excludes_future_transactions(self):
        self.seed_weekly_spending()
        self.create_transaction(
            day=date(2026, 9, 1),
            category=self.groceries,
            amount=Decimal("500.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92)

        self.assertEqual(result["anomaly_count"], 0)

    def test_history_before_the_review_window_builds_the_baseline(self):
        self.seed_weekly_spending(start=date(2026, 4, 1))
        outlier = self.create_transaction(
            day=date(2026, 8, 15),
            category=self.groceries,
            amount=Decimal("500.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=30)

        self.assertEqual(result["transaction_count_analyzed"], 1)
        self.assertEqual(result["anomaly_count"], 1)
        self.assertEqual(result["anomalies"][0]["transaction_id"], outlier.id)

    def test_limit_returns_the_highest_scoring_anomaly(self):
        self.seed_weekly_spending()
        lower = self.create_transaction(
            day=date(2026, 7, 13),
            category=self.groceries,
            amount=Decimal("200.00"),
        )
        higher = self.create_transaction(
            day=date(2026, 7, 20),
            category=self.groceries,
            amount=Decimal("500.00"),
        )

        result = detect_anomalies(self.user, as_of=self.anchor, days=92, limit=1)

        self.assertEqual(result["anomaly_count"], 1)
        self.assertNotEqual(lower.id, higher.id)
        self.assertEqual(result["anomalies"][0]["transaction_id"], higher.id)


@override_settings(
    AI_INSIGHTS_ENABLED=True,
    PASSWORD_HASHERS=FAST_PASSWORD_HASHERS,
)
class AnomalyDetectorApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="anomaly_api_owner",
            email="anomaly-api@example.com",
            password="StrongPass123!",
        )
        self.url = reverse("ai_insights:transaction-anomalies")

    def test_authenticated_user_can_request_anomaly_review(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(
            self.url,
            {"as_of": "2026-08-31", "days": 92, "limit": 10},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["as_of"], date(2026, 8, 31))
        self.assertEqual(response.data["window"]["days"], 92)
        self.assertEqual(response.data["anomalies"], [])

    def test_endpoint_requires_authentication(self):
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_endpoint_validates_date_days_and_limit(self):
        self.client.force_authenticate(self.user)

        invalid_date = self.client.get(self.url, {"as_of": "08/31/2026"})
        invalid_days = self.client.get(self.url, {"days": 0})
        invalid_limit = self.client.get(self.url, {"limit": 101})

        self.assertEqual(invalid_date.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_days.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(invalid_limit.status_code, status.HTTP_400_BAD_REQUEST)

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_disabled_feature_returns_service_unavailable(self):
        self.client.force_authenticate(self.user)

        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "disabled")
