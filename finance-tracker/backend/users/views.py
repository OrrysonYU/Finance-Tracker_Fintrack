import logging

from django.contrib.auth import get_user_model
from django.core.files.storage import default_storage
from django.http import FileResponse
from rest_framework import permissions, status
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from .serializers import LoginSerializer, RegisterSerializer, UserSerializer
from .services import ProfileImageValidationError, delete_profile_image, replace_profile_image

User = get_user_model()
logger = logging.getLogger(__name__)


class RegisterView(CreateAPIView):
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "user": UserSerializer(user).data,
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer
    permission_classes = [permissions.AllowAny]


class RefreshView(TokenRefreshView):
    permission_classes = [permissions.AllowAny]


class MeView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ProfileImageView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        image = request.user.profile_image
        if not image or not image.name:
            return Response({"detail": "No profile image is set."}, status=status.HTTP_404_NOT_FOUND)
        try:
            handle = default_storage.open(image.name, "rb")
        except (FileNotFoundError, OSError):
            logger.warning("Profile image reference is missing for user %s", request.user.pk)
            return Response({"detail": "No profile image is set."}, status=status.HTTP_404_NOT_FOUND)
        response = FileResponse(handle, content_type="image/jpeg")
        response["Cache-Control"] = "private, no-store"
        response["Content-Disposition"] = 'inline; filename="profile-image.jpg"'
        response["X-Content-Type-Options"] = "nosniff"
        return response

    def post(self, request):
        uploaded_file = request.FILES.get("image") or request.FILES.get("profile_image")
        try:
            user = replace_profile_image(request.user, uploaded_file)
        except ProfileImageValidationError as exc:
            return Response({"image": [str(exc)]}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception("Profile image upload failed for user %s", request.user.pk)
            return Response(
                {"detail": "The profile image could not be saved. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(UserSerializer(user, context={"request": request}).data)

    def delete(self, request):
        try:
            user = delete_profile_image(request.user)
        except Exception:
            logger.exception("Profile image deletion failed for user %s", request.user.pk)
            return Response(
                {"detail": "The profile image could not be deleted. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(UserSerializer(user, context={"request": request}).data)
