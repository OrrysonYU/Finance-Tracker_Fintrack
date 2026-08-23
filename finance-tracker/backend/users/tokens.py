from rest_framework_simplejwt.tokens import RefreshToken


def auth_epoch_claim(user):
    return user.auth_epoch.isoformat() if user.auth_epoch else None


def issue_token_pair(user):
    refresh = RefreshToken.for_user(user)
    if user.auth_epoch:
        refresh["auth_epoch"] = auth_epoch_claim(user)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}
