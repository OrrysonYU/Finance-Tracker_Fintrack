from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class AIInsightsHealthTests(APITestCase):
    @override_settings(AI_INSIGHTS_ENABLED=True)
    def test_health_endpoint_reports_ready_when_enabled(self):
        response = self.client.get(reverse("ai_insights:health"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data,
            {
                "module": "ai_insights",
                "enabled": True,
                "status": "ok",
                "service": {"status": "ready", "provider": "placeholder"},
            },
        )

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_health_endpoint_reports_unavailable_when_disabled(self):
        response = self.client.get(reverse("ai_insights:health"))

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "disabled")
        self.assertIs(response.data["enabled"], False)

    @override_settings(AI_INSIGHTS_ENABLED=True, AI_INSIGHTS_PROVIDER="unknown")
    def test_health_endpoint_isolates_an_unsupported_provider(self):
        response = self.client.get(reverse("ai_insights:health"))

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["status"], "unavailable")

    @override_settings(AI_INSIGHTS_ENABLED=False)
    def test_disabling_ai_does_not_remove_core_routes(self):
        response = self.client.get("/api/reports/monthly-summary/")

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
