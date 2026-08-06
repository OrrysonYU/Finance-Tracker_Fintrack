"""High-value API smoke coverage for Fintrack's critical user journey."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from budgets.models import Budget, BudgetItem
from finance.models import Account, Category, SavingGoal, Transaction


User = get_user_model()


class CoreWorkflowSmokeTests(APITestCase):
    """Exercise the core API through the same JWT boundary used by clients."""

    password = "SmokeTestPass123!"

    def register_user(self, username="smoke-user", *, client=None):
        client = client or self.client
        response = client.post(
            reverse("register"),
            {
                "username": username,
                "email": f"{username}@example.com",
                "password": self.password,
                "password_confirm": self.password,
                "default_currency": "usd",
                "locale": "en-US",
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertContainsKeys(response.data, "user", "access", "refresh")
        return response

    def authenticate(self, username="smoke-user", *, client=None):
        client = client or self.client
        registration = self.register_user(username, client=client)
        client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {registration.data['access']}"
        )
        return User.objects.get(pk=registration.data["user"]["id"])

    def create_category(self, category_type, name, *, client=None):
        client = client or self.client
        response = client.post(
            reverse("category-list"),
            {"name": name, "category_type": category_type},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def create_account(self, *, client=None, opening_balance="1000.00"):
        client = client or self.client
        response = client.post(
            reverse("account-list"),
            {
                "name": "Primary Wallet",
                "type": Account.Type.CASH,
                "currency": "usd",
                "opening_balance": opening_balance,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def create_transaction(
        self,
        account_id,
        category_id,
        *,
        amount,
        is_credit=False,
        description="Smoke transaction",
        client=None,
    ):
        client = client or self.client
        response = client.post(
            reverse("transaction-list"),
            {
                "account": account_id,
                "category": category_id,
                "amount": amount,
                "is_credit": is_credit,
                "description": description,
            },
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        return response.data

    def assertContainsKeys(self, payload, *keys):
        self.assertTrue(
            set(keys).issubset(payload),
            f"Expected {keys!r} in response keys {tuple(payload)!r}",
        )

    def assertMoneyEqual(self, actual, expected):
        self.assertEqual(Decimal(str(actual)), Decimal(expected))

    def test_registration_login_and_authenticated_profile_round_trip(self):
        registration = self.register_user()

        self.assertEqual(registration.data["user"]["username"], "smoke-user")
        self.assertEqual(registration.data["user"]["default_currency"], "USD")
        self.assertNotIn("password", registration.data["user"])

        user = User.objects.get(username="smoke-user")
        self.assertEqual(user.email, "smoke-user@example.com")
        self.assertTrue(user.check_password(self.password))

        login = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "smoke-user", "password": self.password},
            format="json",
        )
        self.assertEqual(login.status_code, status.HTTP_200_OK, login.data)
        self.assertContainsKeys(login.data, "user", "access", "refresh")

        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.data['access']}")
        profile = self.client.get(reverse("me"))
        self.assertEqual(profile.status_code, status.HTTP_200_OK, profile.data)
        self.assertEqual(profile.data["id"], user.id)
        self.assertEqual(profile.data["email"], user.email)

        invalid_login = self.client.post(
            reverse("token_obtain_pair"),
            {"username": "smoke-user", "password": "incorrect-password"},
            format="json",
        )
        self.assertEqual(invalid_login.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertNotIn("access", invalid_login.data)

    def test_critical_endpoints_require_authentication(self):
        protected_urls = (
            reverse("me"),
            reverse("account-list"),
            reverse("transaction-list"),
            reverse("budget-list"),
            reverse("savinggoal-list"),
            reverse("monthly-summary"),
        )

        for url in protected_urls:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_account_create_list_and_retrieve_persists_owner_and_balance(self):
        user = self.authenticate()
        create_response = self.client.post(
            reverse("account-list"),
            {
                "name": "Everyday Account",
                "type": Account.Type.BANK,
                "currency": "usd",
                "opening_balance": "500.00",
                "balance": "9999.00",
            },
            format="json",
        )

        self.assertEqual(
            create_response.status_code, status.HTTP_201_CREATED, create_response.data
        )
        self.assertContainsKeys(
            create_response.data,
            "id",
            "name",
            "type",
            "currency",
            "opening_balance",
            "balance",
        )
        self.assertEqual(create_response.data["currency"], "USD")
        self.assertMoneyEqual(create_response.data["balance"], "500.00")

        account = Account.objects.get(pk=create_response.data["id"])
        self.assertEqual(account.user, user)
        self.assertEqual(account.balance, Decimal("500.00"))

        detail = self.client.get(reverse("account-detail", args=[account.id]))
        listing = self.client.get(reverse("account-list"))
        self.assertEqual(detail.status_code, status.HTTP_200_OK, detail.data)
        self.assertEqual(listing.status_code, status.HTTP_200_OK, listing.data)
        self.assertEqual(detail.data["id"], account.id)
        self.assertEqual([item["id"] for item in listing.data["results"]], [account.id])

    def test_transaction_create_and_retrieve_updates_balance_and_validates_direction(self):
        self.authenticate()
        account = self.create_account()
        groceries = self.create_category(Category.Type.EXPENSE, "Groceries")

        transaction = self.create_transaction(
            account["id"],
            groceries["id"],
            amount="125.00",
            description="Weekly groceries",
        )

        self.assertContainsKeys(
            transaction,
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "amount",
            "signed_amount",
        )
        self.assertMoneyEqual(transaction["signed_amount"], "-125.00")

        stored = Transaction.objects.select_related("account", "category").get(
            pk=transaction["id"]
        )
        self.assertEqual(stored.account_id, account["id"])
        self.assertEqual(stored.category_id, groceries["id"])

        detail = self.client.get(reverse("transaction-detail", args=[stored.id]))
        listing = self.client.get(reverse("transaction-list"))
        account_detail = self.client.get(
            reverse("account-detail", args=[account["id"]])
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK, detail.data)
        self.assertEqual(listing.status_code, status.HTTP_200_OK, listing.data)
        self.assertEqual(listing.data["results"][0]["id"], stored.id)
        self.assertMoneyEqual(account_detail.data["balance"], "875.00")

        wrong_direction = self.client.post(
            reverse("transaction-list"),
            {
                "account": account["id"],
                "category": groceries["id"],
                "amount": "20.00",
                "is_credit": True,
            },
            format="json",
        )
        self.assertEqual(wrong_direction.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("category", wrong_direction.data)
        self.assertEqual(Transaction.objects.count(), 1)

    def test_budget_create_retrieve_and_utilization_reflects_spending(self):
        user = self.authenticate()
        account = self.create_account()
        groceries = self.create_category(Category.Type.EXPENSE, "Groceries")
        self.create_transaction(
            account["id"], groceries["id"], amount="120.00", description="Food shop"
        )

        created = self.client.post(
            reverse("budget-list"),
            {
                "name": "Monthly Essentials",
                "period": Budget.Period.MONTH,
                "items": [
                    {"category": groceries["id"], "limit_amount": "200.00"}
                ],
            },
            format="json",
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertEqual(len(created.data["items"]), 1)
        budget = Budget.objects.get(pk=created.data["id"])
        item = BudgetItem.objects.get(budget=budget)
        self.assertEqual(budget.user, user)
        self.assertEqual(item.category_id, groceries["id"])

        detail = self.client.get(reverse("budget-detail", args=[budget.id]))
        utilization = self.client.get(
            reverse("budget-utilization", args=[budget.id])
        )
        self.assertEqual(detail.status_code, status.HTTP_200_OK, detail.data)
        self.assertEqual(utilization.status_code, status.HTTP_200_OK, utilization.data)
        self.assertEqual(utilization.data["budget"]["id"], budget.id)
        self.assertMoneyEqual(utilization.data["totals"]["limit"], "200.00")
        self.assertMoneyEqual(utilization.data["totals"]["spent"], "120.00")
        self.assertMoneyEqual(utilization.data["totals"]["remaining"], "80.00")
        self.assertMoneyEqual(utilization.data["totals"]["usage_percent"], "60.00")
        self.assertFalse(utilization.data["totals"]["is_over_budget"])

    def test_savings_goal_create_retrieve_and_progress_update(self):
        user = self.authenticate()
        deadline = timezone.localdate() + timedelta(days=90)
        created = self.client.post(
            reverse("savinggoal-list"),
            {
                "name": "Emergency Fund",
                "currency": "usd",
                "target_amount": "1000.00",
                "current_amount": "250.00",
                "deadline": deadline.isoformat(),
            },
            format="json",
        )

        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        self.assertMoneyEqual(created.data["progress_percent"], "25.00")
        self.assertMoneyEqual(created.data["remaining_amount"], "750.00")
        goal = SavingGoal.objects.get(pk=created.data["id"])
        self.assertEqual(goal.user, user)

        updated = self.client.patch(
            reverse("savinggoal-detail", args=[goal.id]),
            {"current_amount": "750.00"},
            format="json",
        )
        detail = self.client.get(reverse("savinggoal-detail", args=[goal.id]))
        self.assertEqual(updated.status_code, status.HTTP_200_OK, updated.data)
        self.assertEqual(detail.status_code, status.HTTP_200_OK, detail.data)
        self.assertMoneyEqual(detail.data["progress_percent"], "75.00")
        self.assertMoneyEqual(detail.data["remaining_amount"], "250.00")
        goal.refresh_from_db()
        self.assertEqual(goal.current_amount, Decimal("750.00"))

        overfunded = self.client.patch(
            reverse("savinggoal-detail", args=[goal.id]),
            {"current_amount": "1001.00"},
            format="json",
        )
        self.assertEqual(overfunded.status_code, status.HTTP_400_BAD_REQUEST)
        goal.refresh_from_db()
        self.assertEqual(goal.current_amount, Decimal("750.00"))

    def test_reports_generate_consistent_summary_and_dashboard_data(self):
        self.authenticate()
        account = self.create_account(opening_balance="500.00")
        salary = self.create_category(Category.Type.INCOME, "Salary")
        groceries = self.create_category(Category.Type.EXPENSE, "Groceries")
        self.create_transaction(
            account["id"],
            salary["id"],
            amount="600.00",
            is_credit=True,
            description="Monthly salary",
        )
        self.create_transaction(
            account["id"],
            groceries["id"],
            amount="150.00",
            description="Monthly groceries",
        )
        goal = self.client.post(
            reverse("savinggoal-list"),
            {
                "name": "Holiday",
                "target_amount": "1000.00",
                "current_amount": "200.00",
            },
            format="json",
        )
        budget = self.client.post(
            reverse("budget-list"),
            {
                "name": "Food Budget",
                "period": Budget.Period.MONTH,
                "items": [
                    {"category": groceries["id"], "limit_amount": "300.00"}
                ],
            },
            format="json",
        )
        self.assertEqual(goal.status_code, status.HTTP_201_CREATED, goal.data)
        self.assertEqual(budget.status_code, status.HTTP_201_CREATED, budget.data)

        period = timezone.localdate()
        query = {"year": period.year, "month": period.month}
        summary = self.client.get(reverse("monthly-summary"), query)
        dashboard = self.client.get(reverse("dashboard-overview"), query)

        self.assertEqual(summary.status_code, status.HTTP_200_OK, summary.data)
        self.assertContainsKeys(
            summary.data,
            "period",
            "period_start",
            "period_end",
            "income",
            "expense",
            "net",
            "transaction_count",
        )
        self.assertMoneyEqual(summary.data["income"], "600.00")
        self.assertMoneyEqual(summary.data["expense"], "150.00")
        self.assertMoneyEqual(summary.data["net"], "450.00")
        self.assertEqual(summary.data["transaction_count"], 2)

        self.assertEqual(dashboard.status_code, status.HTTP_200_OK, dashboard.data)
        self.assertContainsKeys(
            dashboard.data,
            "generated_at",
            "period",
            "summary",
            "category_spend",
            "accounts",
            "goals",
            "budgets",
        )
        self.assertEqual(dashboard.data["summary"], summary.data)
        self.assertMoneyEqual(dashboard.data["accounts"]["total_balance"], "950.00")
        self.assertEqual(dashboard.data["goals"]["count"], 1)
        self.assertEqual(dashboard.data["budgets"]["active_count"], 1)
        self.assertMoneyEqual(
            dashboard.data["category_spend"]["by_category"]["Groceries"],
            "150.00",
        )

        invalid_period = self.client.get(
            reverse("monthly-summary"), {"year": period.year}
        )
        self.assertEqual(invalid_period.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", invalid_period.data)

    def test_users_cannot_access_or_link_another_users_resources(self):
        owner_client = APIClient()
        other_client = APIClient()
        owner = self.authenticate("resource-owner", client=owner_client)
        other = self.authenticate("resource-other", client=other_client)
        account = self.create_account(client=owner_client)
        category = self.create_category(
            Category.Type.EXPENSE, "Owner Expense", client=owner_client
        )

        hidden_account = other_client.get(
            reverse("account-detail", args=[account["id"]])
        )
        foreign_transaction = other_client.post(
            reverse("transaction-list"),
            {
                "account": account["id"],
                "category": category["id"],
                "amount": "10.00",
                "is_credit": False,
            },
            format="json",
        )

        self.assertNotEqual(owner.id, other.id)
        self.assertEqual(hidden_account.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(
            foreign_transaction.status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertIn("account", foreign_transaction.data)
        self.assertFalse(Transaction.objects.exists())
