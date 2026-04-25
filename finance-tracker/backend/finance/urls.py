from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AccountViewSet, TransactionViewSet, SavingGoalViewSet, CategoryViewSet

router = DefaultRouter()
router.register(r'accounts', AccountViewSet, basename='account')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'saving-goals', SavingGoalViewSet, basename='savinggoal')
router.register(r'categories', CategoryViewSet, basename='category')

urlpatterns = [
    path('', include(router.urls)),
]
