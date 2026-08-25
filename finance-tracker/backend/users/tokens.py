from rest_framework_simplejwt.tokens import RefreshToken

from .session_services import create_session, record_activity


def auth_epoch_claim(user):
    return user.auth_epoch.isoformat() if user.auth_epoch else None


def issue_token_pair(user, request=None, authentication_method="password"):
    session = create_session(user, request=request, authentication_method=authentication_method)
    refresh = RefreshToken.for_user(user)
    refresh["sid"] = str(session.id)
    if user.auth_epoch:
        refresh["auth_epoch"] = auth_epoch_claim(user)
    record_activity(user, "login_success", request=request, session=session)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}
