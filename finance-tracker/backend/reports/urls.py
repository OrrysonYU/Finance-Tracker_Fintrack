from django.urls import path

from .views import by_category, category_spend, monthly_summary


urlpatterns = [
    path("monthly-summary/", monthly_summary, name="monthly-summary"),
    path("category-spend/", category_spend, name="category-spend"),
    path("by-category/", by_category, name="by-category"),
    path("reports/monthly-summary/", monthly_summary, name="legacy-monthly-summary"),
    path("reports/by-category/", by_category, name="legacy-by-category"),
]
