from django.contrib.auth.backends import ModelBackend

from .models import User
from .username import canonicalize_username


class CanonicalUsernameBackend(ModelBackend):
    """Authenticate usernames through the same NFKC/case-folded identity key."""

    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None or password is None:
            return None
        try:
            user = User.objects.get(username_canonical=canonicalize_username(username))
        except User.DoesNotExist:
            return None
        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None
