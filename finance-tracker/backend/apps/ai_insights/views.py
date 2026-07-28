from collections.abc import Mapping
from datetime import date

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import permissions, response, status
from rest_framework.decorators import api_view, permission_classes

from budgets.models import Budget

from .services import AIServiceConfigurationError, get_ai_insights_service
from .services.anomaly_detector import (
    DEFAULT_ANOMALY_LIMIT,
    DEFAULT_LOOKBACK_DAYS,
    MAX_ANOMALY_LIMIT,
    MAX_LOOKBACK_DAYS,
    detect_anomalies,
)
from .services.budget_forecast import calculate_budget_forecast
from .services.category_suggester import suggest_category
from .services.spending_insights import (
    DEFAULT_INSIGHT_LIMIT,
    MAX_INSIGHT_LIMIT,
    generate_spending_insights,
)


def _disabled_response():
    return response.Response(
        {
            "module": "ai_insights",
            "enabled": False,
            "status": "disabled",
        },
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


def _month_from_query(request):
    year = request.query_params.get("year")
    month = request.query_params.get("month")
    if year is None and month is None:
        return None, None
    if not year or not month:
        return None, response.Response(
            {"detail": "Provide both year and month, or neither."},
            status=status.HTTP_400_BAD_REQUEST,
        )
    try:
        return date(int(year), int(month), 1), None
    except (TypeError, ValueError):
        return None, response.Response(
            {"detail": "Year and month must form a valid calendar month."},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _as_of_from_query(request):
    value = request.query_params.get("as_of")
    if value is None:
        return None, None
    try:
        return date.fromisoformat(value), None
    except (TypeError, ValueError):
        return None, response.Response(
            {"as_of": ["Use a valid date in YYYY-MM-DD format."]},
            status=status.HTTP_400_BAD_REQUEST,
        )


def _bounded_int_from_query(request, name, default, maximum):
    raw_value = request.query_params.get(name, default)
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        value = 0
    if not 1 <= value <= maximum:
        return None, response.Response(
            {name: [f"Use a whole number between 1 and {maximum}."]},
            status=status.HTTP_400_BAD_REQUEST,
        )
    return value, None


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


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def spending_insights(request):
    """Return explainable observations for a calendar month."""

    if not settings.AI_INSIGHTS_ENABLED:
        return _disabled_response()

    anchor_date, error_response = _month_from_query(request)
    if error_response:
        return error_response

    raw_limit = request.query_params.get("limit", DEFAULT_INSIGHT_LIMIT)
    try:
        limit = int(raw_limit)
    except (TypeError, ValueError):
        limit = 0
    if not 1 <= limit <= MAX_INSIGHT_LIMIT:
        return response.Response(
            {"limit": [f"Use a whole number between 1 and {MAX_INSIGHT_LIMIT}."]},
            status=status.HTTP_400_BAD_REQUEST,
        )

    return response.Response(
        generate_spending_insights(request.user, anchor_date=anchor_date, limit=limit)
    )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def budget_forecast(request, budget_id):
    """Return a run-rate forecast for one of the authenticated user's budgets."""

    if not settings.AI_INSIGHTS_ENABLED:
        return _disabled_response()

    as_of, error_response = _as_of_from_query(request)
    if error_response:
        return error_response

    budget = get_object_or_404(
        Budget.objects.all(),
        id=budget_id,
        user=request.user,
    )
    return response.Response(calculate_budget_forecast(budget, as_of=as_of))


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def transaction_anomalies(request):
    """Return unusually large expense transactions for review."""

    if not settings.AI_INSIGHTS_ENABLED:
        return _disabled_response()

    as_of, error_response = _as_of_from_query(request)
    if error_response:
        return error_response

    days, error_response = _bounded_int_from_query(
        request,
        "days",
        DEFAULT_LOOKBACK_DAYS,
        MAX_LOOKBACK_DAYS,
    )
    if error_response:
        return error_response

    limit, error_response = _bounded_int_from_query(
        request,
        "limit",
        DEFAULT_ANOMALY_LIMIT,
        MAX_ANOMALY_LIMIT,
    )
    if error_response:
        return error_response

    return response.Response(
        detect_anomalies(
            request.user,
            as_of=as_of,
            days=days,
            limit=limit,
        )
    )
