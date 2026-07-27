from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.ai_insights.services.category_suggester import suggest_category
from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class CategorySuggesterServiceTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="suggestion_owner",
            email="suggestions@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="suggestion_other",
            email="other-suggestions@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Everyday Wallet",
            type=Account.Type.CASH,
        )
        self.other_account = Account.objects.create(
            user=self.other_user,
            name="Other Wallet",
            type=Account.Type.CASH,
        )
        self.salary = Category.objects.create(
            name="Salary",
            category_type=Category.Type.INCOME,
        )
        self.housing = Category.objects.create(
            name="Housing",
            category_type=Category.Type.EXPENSE,
        )
        self.groceries = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.transport = Category.objects.create(
            name="Transport",
            category_type=Category.Type.EXPENSE,
        )
        self.shopping = Category.objects.create(
            name="Shopping",
            category_type=Category.Type.EXPENSE,
        )

    def test_common_descriptions_map_to_sensible_categories(self):
        examples = (
            ("July salary from employer", True, self.salary),
            ("Monthly rent to landlord", False, self.housing),
            ("Shell fuel station", False, self.transport),
            ("Naivas supermarket", False, self.groceries),
        )

        for description, is_credit, expected_category in examples:
            with self.subTest(description=description):
                suggestion = suggest_category(
                    user=self.user,
                    description=description,
                    is_credit=is_credit,
                )

                self.assertIsNotNone(suggestion)
                self.assertEqual(suggestion.category_id, expected_category.id)
                self.assertEqual(suggestion.source, "keyword")

    def test_direction_prevents_an_income_category_for_an_expense(self):
        suggestion = suggest_category(
            user=self.user,
            description="Monthly salary",
            is_credit=False,
        )

        self.assertIsNone(suggestion)

    def test_user_history_takes_precedence_over_a_generic_rule(self):
        balance_service.create_transaction(
            account=self.account,
            category=self.shopping,
            amount=Decimal("20.00"),
            description="Acme Supermarket",
            is_credit=False,
        )

        suggestion = suggest_category(
            user=self.user,
            description="Acme Supermarket",
            is_credit=False,
        )

        self.assertEqual(suggestion.category_id, self.shopping.id)
        self.assertEqual(suggestion.source, "user_history")
        self.assertEqual(suggestion.confidence, 0.99)

    def test_similar_merchant_descriptions_use_user_history(self):
        balance_service.create_transaction(
            account=self.account,
            category=self.shopping,
            amount=Decimal("20.00"),
            description="POS Acme Market 001",
            is_credit=False,
        )

        suggestion = suggest_category(
            user=self.user,
            description="Acme Market 1042",
            is_credit=False,
        )

        self.assertEqual(suggestion.category_id, self.shopping.id)
        self.assertEqual(suggestion.source, "user_history")

    def test_another_users_history_is_not_used(self):
        balance_service.create_transaction(
            account=self.other_account,
            category=self.shopping,
            amount=Decimal("20.00"),
            description="Acme Supermarket",
            is_credit=False,
        )

        suggestion = suggest_category(
            user=self.user,
            description="Acme Supermarket",
            is_credit=False,
        )

        self.assertEqual(suggestion.category_id, self.groceries.id)
        self.assertEqual(suggestion.source, "keyword")

    def test_unknown_description_returns_no_suggestion(self):
        suggestion = suggest_category(
            user=self.user,
            description="Unrecognized merchant xyz",
            is_credit=False,
        )

        self.assertIsNone(suggestion)


@override_settings(
    AI_INSIGHTS_ENABLED=True,
    PASSWORD_HASHERS=FAST_PASSWORD_HASHERS,
)
class CategorySuggestionApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="suggestion_api_owner",
            email="suggestion-api@example.com",
            password="StrongPass123!",
        )
        Category.objects.create(
            name="Transport",
            category_type=Category.Type.EXPENSE,
        )
        self.url = reverse("ai_insights:category-suggestion")

    def test_authenticated_user_can_request_a_suggestion(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url,
            {"description": "Fuel at Shell", "is_credit": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["suggestion"]["category_name"], "Transport")
        self.assertEqual(response.data["suggestion"]["source"], "keyword")

    def test_unknown_description_returns_a_graceful_no_match(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url,
            {"description": "Unknown merchant xyz", "is_credit": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["suggestion"])

    def test_request_requires_authentication_and_valid_input(self):
        unauthenticated_response = self.client.post(
            self.url,
            {"description": "Fuel"},
            format="json",
        )

        self.client.force_authenticate(self.user)
        invalid_response = self.client.post(
            self.url,
            {"description": "", "is_credit": "false"},
            format="json",
        )

        self.assertEqual(
            unauthenticated_response.status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(invalid_response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_non_object_payload_fails_gracefully(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(self.url, ["Fuel"], format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_disabled_feature_returns_service_unavailable(self):
        self.client.force_authenticate(self.user)

        response = self.client.post(
            self.url,
            {"description": "Fuel", "is_credit": False},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "disabled")
