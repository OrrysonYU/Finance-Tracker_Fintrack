from django.contrib.auth import get_user_model
from rest_framework import permissions
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from .serializers import RegisterSerializer, UserSerializer

User = get_user_model()

class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user
