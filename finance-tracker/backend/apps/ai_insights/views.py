from django.conf import settings
from rest_framework import permissions, response, status
from rest_framework.decorators import api_view, permission_classes

from .services import AIServiceConfigurationError, get_ai_insights_service


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    """Report whether the isolated AI module is enabled and available."""

    if not settings.AI_INSIGHTS_ENABLED:
        return response.Response(
            {
                "module": "ai_insights",
                "enabled": False,
                "status": "disabled",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    try:
        service = get_ai_insights_service(settings.AI_INSIGHTS_PROVIDER)
    except AIServiceConfigurationError:
        return response.Response(
            {
                "module": "ai_insights",
                "enabled": True,
                "status": "unavailable",
                "detail": "The configured AI provider is unavailable.",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    service_health = service.health_check()
    return response.Response(
        {
            "module": "ai_insights",
            "enabled": True,
            "status": "ok",
            "service": service_health.as_dict(),
        }
    )
