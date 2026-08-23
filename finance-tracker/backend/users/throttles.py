import hashlib

from rest_framework.throttling import ScopedRateThrottle

from .username import UsernamePolicyError, canonicalize_username


class AuthScopedRateThrottle(ScopedRateThrottle):
    """Rate-limit an auth principal and source, rather than an entire NAT IP."""

    def get_cache_key(self, request, view):
        authenticated_identifier = (
            f"user:{request.user.pk}"
            if getattr(request, "user", None) and request.user.is_authenticated
            else None
        )
        challenge_identifier = None
        if request.path.rstrip("/").endswith("/mfa/challenge"):
            challenge = request.data.get("challenge")
            if challenge:
                from .models import MFAChallenge

                challenge_hash = hashlib.sha256(str(challenge).encode("utf-8")).hexdigest()
                challenge_identifier = (
                    f"mfa-user:{user_id}"
                    if (user_id := MFAChallenge.objects.filter(token_hash=challenge_hash).values_list("user_id", flat=True).first())
                    else None
                )
        identifier = authenticated_identifier or challenge_identifier or (
            request.data.get("username")
            or request.data.get("email")
            or request.data.get("refresh")
            or request.data.get("challenge")
            or "anonymous"
        )
        try:
            normalized_identifier = canonicalize_username(str(identifier))
        except UsernamePolicyError:
            normalized_identifier = str(identifier).strip().casefold()
        digest = hashlib.sha256(normalized_identifier.encode()).hexdigest()[:32]
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": f"{ident}:{digest}"}
