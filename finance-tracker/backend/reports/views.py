from datetime import date

from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions, response, status

from reports.services.category_spend import calculate_category_spend
from reports.services.dashboard_overview import calculate_dashboard_overview
from reports.services.monthly_summary import calculate_monthly_summary


def _period_from_query(request):
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
    except ValueError:
        return None, response.Response(
            {"detail": "Year and month must form a valid calendar month."},
            status=status.HTTP_400_BAD_REQUEST,
        )


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def monthly_summary(request):
    """Return current-month income, expense, and net totals."""
    anchor_date, error_response = _period_from_query(request)
    if error_response:
        return error_response

    return response.Response(calculate_monthly_summary(request.user, anchor_date))


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def category_spend(request):
    """Return current-month expense totals grouped by category."""
    anchor_date, error_response = _period_from_query(request)
    if error_response:
        return error_response

    return response.Response(calculate_category_spend(request.user, anchor_date))


@api_view(["GET"])
@permission_classes([permissions.IsAuthenticated])
def dashboard_overview(request):
    """Return one stable payload for the dashboard landing page."""
    anchor_date, error_response = _period_from_query(request)
    if error_response:
        return error_response

    return response.Response(calculate_dashboard_overview(request.user, anchor_date))


by_category = category_spend
