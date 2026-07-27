"""Public service contract for the AI insights module.

Ledger and reporting code should depend on neither this module nor a concrete
AI provider. Future AI implementations conform to ``AIInsightsService`` and
are selected inside this feature boundary.
"""

from dataclasses import asdict, dataclass
from typing import Protocol, runtime_checkable


@dataclass(frozen=True, slots=True)
class AIServiceHealth:
    """Provider-neutral health information returned by an AI service."""

    status: str
    provider: str

    def as_dict(self):
        return asdict(self)


@runtime_checkable
class AIInsightsService(Protocol):
    """Minimum contract implemented by an AI insights provider."""

    def health_check(self) -> AIServiceHealth:
        """Return provider-neutral service readiness information."""

        ...


class AIServiceConfigurationError(ValueError):
    """Raised when the selected AI provider is not available."""


class PlaceholderAIInsightsService:
    """Dependency-free provider used until an AI implementation is selected."""

    provider_name = "placeholder"

    def health_check(self) -> AIServiceHealth:
        return AIServiceHealth(status="ready", provider=self.provider_name)


def get_ai_insights_service(provider: str = "placeholder") -> AIInsightsService:
    """Return the configured service without exposing it to core modules."""

    if provider.strip().lower() == "placeholder":
        return PlaceholderAIInsightsService()

    raise AIServiceConfigurationError(f"Unsupported AI insights provider: {provider}")


__all__ = [
    "AIInsightsService",
    "AIServiceConfigurationError",
    "AIServiceHealth",
    "PlaceholderAIInsightsService",
    "get_ai_insights_service",
]
