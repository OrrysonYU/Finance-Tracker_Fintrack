from django.urls import path

from .views import category_suggestion, health


app_name = "ai_insights"

urlpatterns = [
    path("health/", health, name="health"),
    path("category-suggestions/", category_suggestion, name="category-suggestion"),
]
