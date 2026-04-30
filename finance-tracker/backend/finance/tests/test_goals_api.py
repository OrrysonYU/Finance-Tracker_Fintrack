from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import override_settings
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from finance.models import SavingGoal
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class SavingGoalApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="goal_owner",
            email="goal-owner@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="goal_other",
            email="goal-other@example.com",
            password="StrongPass123!",
        )
        self.url = "/api/finance/saving-goals/"

    def test_authenticated_user_can_create_saving_goal(self):
        self.client.force_authenticate(self.user)
        deadline = timezone.localdate() + timedelta(days=90)

        response = self.client.post(
            self.url,
            {
                "name": "Emergency Fund",
                "description": "Three months of expenses",
                "currency": "usd",
                "target_amount": "1000.00",
                "current_amount": "250.00",
                "deadline": deadline.isoformat(),
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["name"], "Emergency Fund")
        self.assertEqual(response.data["currency"], "USD")
        self.assertEqual(response.data["target_amount"], "1000.00")
        self.assertEqual(response.data["current_amount"], "250.00")
        self.assertEqual(response.data["remaining_amount"], "750.00")
        self.assertEqual(response.data["progress_percent"], "25.00")
        self.assertFalse(response.data["is_completed"])

        goal = SavingGoal.objects.get(id=response.data["id"])
        self.assertEqual(goal.user, self.user)

    def test_user_only_lists_their_own_saving_goals(self):
        owner_goal = SavingGoal.objects.create(
            user=self.user,
            name="Owner Goal",
            target_amount=Decimal("500.00"),
        )
        SavingGoal.objects.create(
            user=self.other_user,
            name="Other Goal",
            target_amount=Decimal("500.00"),
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["id"], owner_goal.id)

    def test_user_cannot_retrieve_another_users_saving_goal(self):
        other_goal = SavingGoal.objects.create(
            user=self.other_user,
            name="Private Goal",
            target_amount=Decimal("500.00"),
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(f"{self.url}{other_goal.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_saving_goal_validates_amounts_and_deadline(self):
        self.client.force_authenticate(self.user)
        past_date = timezone.localdate() - timedelta(days=1)

        zero_target = self.client.post(
            self.url,
            {
                "name": "Invalid Target",
                "target_amount": "0.00",
                "current_amount": "0.00",
            },
            format="json",
        )
        overfunded = self.client.post(
            self.url,
            {
                "name": "Overfunded",
                "target_amount": "100.00",
                "current_amount": "150.00",
            },
            format="json",
        )
        past_deadline = self.client.post(
            self.url,
            {
                "name": "Past Goal",
                "target_amount": "100.00",
                "deadline": past_date.isoformat(),
            },
            format="json",
        )

        self.assertEqual(zero_target.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(overfunded.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(past_deadline.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_can_update_goal_progress_independently(self):
        goal = SavingGoal.objects.create(
            user=self.user,
            name="Laptop",
            target_amount=Decimal("1000.00"),
            current_amount=Decimal("100.00"),
        )

        self.client.force_authenticate(self.user)
        response = self.client.patch(
            f"{self.url}{goal.id}/",
            {"current_amount": "1000.00"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["current_amount"], "1000.00")
        self.assertEqual(response.data["remaining_amount"], "0.00")
        self.assertEqual(response.data["progress_percent"], "100.00")
        self.assertTrue(response.data["is_completed"])
