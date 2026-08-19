import hashlib

from rest_framework.throttling import ScopedRateThrottle


class AuthScopedRateThrottle(ScopedRateThrottle):
    """Rate-limit an auth principal and source, rather than an entire NAT IP."""

    def get_cache_key(self, request, view):
        identifier = (
            request.data.get("username")
            or request.data.get("email")
            or request.data.get("refresh")
            or "anonymous"
        )
        digest = hashlib.sha256(str(identifier).strip().lower().encode()).hexdigest()[:32]
        ident = self.get_ident(request)
        return self.cache_format % {"scope": self.scope, "ident": f"{ident}:{digest}"}
