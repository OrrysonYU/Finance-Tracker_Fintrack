import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from django.conf import settings
from cryptography.fernet import Fernet, InvalidToken


def _fernet():
    key = settings.MFA_ENCRYPTION_KEY or base64.urlsafe_b64encode(hashlib.sha256(settings.SECRET_KEY.encode()).digest())
    return Fernet(key)


def encrypt_secret(secret: str) -> bytes:
    return _fernet().encrypt(secret.encode("ascii"))


def decrypt_secret(value: bytes) -> str:
    try:
        return _fernet().decrypt(bytes(value)).decode("ascii")
    except (InvalidToken, UnicodeDecodeError, TypeError, ValueError) as exc:
        raise ValueError("Invalid MFA secret") from exc


def generate_totp_secret() -> str:
    return base64.b32encode(secrets.token_bytes(20)).decode("ascii").rstrip("=")


def totp_code(secret: str, timestamp=None, step=30, digits=6) -> str:
    timestamp = time.time() if timestamp is None else timestamp
    counter = int(timestamp // step)
    key = base64.b32decode(secret + "=" * (-len(secret) % 8), casefold=True)
    digest = hmac.new(key, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    number = (struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF) % (10**digits)
    return f"{number:0{digits}d}"


def verify_totp(secret: str, code: str, now=None, drift=None):
    if not isinstance(code, str) or not code.isdigit() or len(code) != 6:
        return None
    drift = settings.MFA_TOTP_ALLOWED_DRIFT if drift is None else drift
    now = time.time() if now is None else now
    current_step = int(now // 30)
    for offset in range(-drift, drift + 1):
        step = current_step + offset
        expected = totp_code(secret, timestamp=step * 30)
        if hmac.compare_digest(expected, code):
            return step
    return None


def provisioning_uri(secret: str, username: str) -> str:
    label = quote(f"{settings.MFA_ISSUER}:{username}")
    issuer = quote(settings.MFA_ISSUER)
    return f"otpauth://totp/{label}?secret={secret}&issuer={issuer}&algorithm=SHA1&digits=6&period=30"


def generate_recovery_code():
    return "-".join(secrets.token_hex(4).upper() for _ in range(3))


def recovery_hash(code: str) -> str:
    normalized = "".join(str(code).upper().split()).replace("-", "")
    return hashlib.sha256(normalized.encode("ascii", "ignore")).hexdigest()


def generate_challenge_token():
    token = secrets.token_urlsafe(32)
    return token, hashlib.sha256(token.encode("ascii")).hexdigest()
