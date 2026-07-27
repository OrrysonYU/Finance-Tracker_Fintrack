from collections.abc import Mapping

from django.conf import settings
from rest_framework import permissions, response, status
from rest_framework.decorators import api_view, permission_classes

from .services import AIServiceConfigurationError, get_ai_insights_service
from .services.category_suggester import suggest_category


def _disabled_response():
    return response.Response(
        {
            "module": "ai_insights",
            "enabled": False,
            "status": "disabled",
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@api_view(["GET"])
@permission_classes([permissions.AllowAny])
def health(request):
    """Report whether the isolated AI module is enabled and available."""

    if not settings.AI_INSIGHTS_ENABLED:
        return _disabled_response()

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


@api_view(["POST"])
@permission_classes([permissions.IsAuthenticated])
def category_suggestion(request):
    """Suggest a visible category without changing the user's ledger."""

    if not settings.AI_INSIGHTS_ENABLED:
        return _disabled_response()

    if not isinstance(request.data, Mapping):
        return response.Response(
            {"detail": "Submit a JSON object containing a description."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    description = request.data.get("description")
    if not isinstance(description, str) or not description.strip():
        return response.Response(
            {"description": ["Provide a non-empty transaction description."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(description) > 255:
        return response.Response(
            {"description": ["Ensure this field has no more than 255 characters."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    is_credit = request.data.get("is_credit")
    if is_credit is not None and not isinstance(is_credit, bool):
        return response.Response(
            {"is_credit": ["Use true, false, or omit this field."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    suggestion = suggest_category(
        user=request.user,
        description=description,
        is_credit=is_credit,
    )
    if suggestion is None:
        return response.Response(
            {
                "suggestion": None,
                "detail": "No reliable category suggestion was found.",
            }
        )

    return response.Response({"suggestion": suggestion.as_dict()})
