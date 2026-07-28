from django.urls import path

from .views import budget_forecast, category_suggestion, health, spending_insights


app_name = "ai_insights"

urlpatterns = [
    path("health/", health, name="health"),
    path("category-suggestions/", category_suggestion, name="category-suggestion"),
    path("spending-insights/", spending_insights, name="spending-insights"),
    path(
        "budget-forecasts/<int:budget_id>/",
        budget_forecast,
        name="budget-forecast",
    ),
    path(
        "budgets/<int:budget_id>/forecast/",
        budget_forecast,
        name="budget-forecast-nested",
    ),
]
