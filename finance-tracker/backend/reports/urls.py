from django.urls import path
from .views import monthly_summary, by_category

urlpatterns = [
    path('reports/monthly-summary/', monthly_summary),
    path('reports/by-category/', by_category),
]
