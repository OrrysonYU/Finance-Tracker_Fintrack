from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import Account


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
