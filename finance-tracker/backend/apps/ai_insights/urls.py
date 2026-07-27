from django.urls import path

from .views import health


app_name = "ai_insights"

urlpatterns = [
    path("health/", health, name="health"),
]
