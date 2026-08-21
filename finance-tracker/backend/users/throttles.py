import hashlib

from rest_framework.throttling import ScopedRateThrottle

from .username import UsernamePolicyError, canonicalize_username


class AuthScopedRateThrottle(ScopedRateThrottle):
    """Rate-limit an auth principal and source, rather than an entire NAT IP."""

    def get_cache_key(self, request, view):
        identifier = (
            request.data.get("username")
            or request.data.get("email")
            or request.data.get("refresh")
            or "anonymous"
        )
        try:
            normalized_identifier = canonicalize_username(str(identifier))
        except UsernamePolicyError:
            normalized_identifier = str(identifier).strip().casefold()
        digest = hashlib.sha256(normalized_identifier.encode()).hexdigest()[:32]
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": f"{ident}:{digest}"}
