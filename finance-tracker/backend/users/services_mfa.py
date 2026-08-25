from django.db import transaction
from django.utils import timezone
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from .mfa import encrypt_secret, generate_recovery_code, generate_totp_secret, recovery_hash
from .models import MFAConfiguration, MFAEnrollment, MFARecoveryCode, UserSession
from .session_services import blacklist_session_refresh_tokens


def revoke_user_sessions(user):
    now = timezone.now()
    user.auth_epoch = now
    user.save(update_fields=["auth_epoch"])
    for outstanding in OutstandingToken.objects.filter(user=user, expires_at__gt=now):
        BlacklistedToken.objects.get_or_create(token=outstanding)
    sessions = UserSession.objects.filter(user=user, revoked_at__isnull=True)
    for session in sessions:
        session.revoked_at = now
        session.save(update_fields=["revoked_at"])
        blacklist_session_refresh_tokens(session)


@transaction.atomic
def begin_enrollment(user):
    secret = generate_totp_secret()
    MFAEnrollment.objects.filter(user=user).delete()
    MFAEnrollment.objects.create(user=user, secret_encrypted=encrypt_secret(secret))
    return secret


@transaction.atomic
def confirm_enrollment(user, secret, used_step):
    MFAEnrollment.objects.select_for_update().get(user=user)
    config, _ = MFAConfiguration.objects.update_or_create(
        user=user,
        defaults={"secret_encrypted": encrypt_secret(secret), "confirmed_at": timezone.now(), "last_used_step": used_step},
    )
    user.mfa_enabled = True
    user.save(update_fields=["mfa_enabled"])
    MFAEnrollment.objects.filter(user=user).delete()
    revoke_user_sessions(user)
    return config


@transaction.atomic
def replace_recovery_codes(config):
    config.recovery_codes.all().delete()
    plaintext = []
    while len(plaintext) < 10:
        code = generate_recovery_code()
        if code not in plaintext:
            plaintext.append(code)
    MFARecoveryCode.objects.bulk_create([MFARecoveryCode(configuration=config, code_hash=recovery_hash(code)) for code in plaintext])
    return plaintext


@transaction.atomic
def disable_mfa(user):
    MFAConfiguration.objects.filter(user=user).delete()
    MFAEnrollment.objects.filter(user=user).delete()
    user.mfa_enabled = False
    user.save(update_fields=["mfa_enabled"])
    revoke_user_sessions(user)
