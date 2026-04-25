"""
URL configuration for backend_project project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from finance.views import api_root  # 👈 or use `home_view` if you prefer plain text

urlpatterns = [
    path('admin/', admin.site.urls),

    # App routes
    path('api/auth/', include('users.urls')),       
    path('api/finance/', include('finance.urls')), 
    path('api/budgets/', include('budgets.urls')),   
    path('api/reports/', include('reports.urls')),

    # Root route (homepage)
    path('', api_root),  # 👈 This makes / show a homepage or JSON overview
]

from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns += [
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]

