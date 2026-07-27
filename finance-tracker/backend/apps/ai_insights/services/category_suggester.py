"""Deterministic transaction category suggestions.

This service deliberately uses only local rules and the authenticated user's
ledger history. It does not call an external model or mutate a transaction.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass
import re

from django.db.models import Q

from finance.models import Category, Transaction


HISTORY_LIMIT = 200
NOISY_MERCHANT_WORDS = {
    "card",
    "debit",
    "online",
    "payment",
    "pos",
    "purchase",
    "the",
    "transaction",
}


@dataclass(frozen=True, slots=True)
class KeywordRule:
    category_slugs: tuple[str, ...]
    keywords: tuple[str, ...]


@dataclass(frozen=True, slots=True)
class CategorySuggestion:
    category_id: int
    category_name: str
    category_slug: str
    category_type: str
    confidence: float
    source: str
    matched_on: str

    def as_dict(self):
        return asdict(self)


KEYWORD_RULES = (
    KeywordRule(
        ("salary",),
        ("salary", "payroll", "paycheck", "wages", "employer deposit"),
    ),
    KeywordRule(
        ("freelance", "business"),
        ("freelance", "client payment", "consulting fee", "invoice paid"),
    ),
    KeywordRule(
        ("housing", "rent"),
        ("rent", "mortgage", "landlord", "property management"),
    ),
    KeywordRule(
        ("groceries",),
        (
            "groceries",
            "grocery",
            "supermarket",
            "carrefour",
            "costco",
            "naivas",
            "tesco",
            "walmart",
            "whole foods",
        ),
    ),
    KeywordRule(
        ("transport",),
        (
            "fuel",
            "petrol",
            "gas station",
            "shell",
            "uber",
            "lyft",
            "taxi",
            "bus fare",
            "train fare",
            "toll",
        ),
    ),
    KeywordRule(
        ("utilities",),
        ("electricity", "water bill", "internet bill", "utility bill", "power bill"),
    ),
    KeywordRule(
        ("dining",),
        ("restaurant", "cafe", "coffee shop", "takeaway", "food delivery"),
    ),
    KeywordRule(
        ("healthcare",),
        ("pharmacy", "hospital", "clinic", "doctor", "medical"),
    ),
    KeywordRule(
        ("education",),
        ("tuition", "school fees", "course fee", "textbook"),
    ),
    KeywordRule(
        ("subscriptions",),
        ("netflix", "spotify", "subscription", "membership"),
    ),
    KeywordRule(
        ("travel",),
        ("airline", "flight", "hotel", "airbnb", "booking com"),
    ),
)


def _normalize(value: str) -> str:
    return " ".join(re.findall(r"[a-z0-9]+", value.casefold()))


def _contains_phrase(description: str, phrase: str) -> bool:
    return f" {_normalize(phrase)} " in f" {description} "


def _merchant_tokens(description: str) -> set[str]:
    return {
        token
        for token in description.split()
        if len(token) > 1 and not token.isdigit() and token not in NOISY_MERCHANT_WORDS
    }


def _visible_categories(user, is_credit):
    category_types = [Category.Type.INCOME, Category.Type.EXPENSE]
    if is_credit is True:
        category_types = [Category.Type.INCOME]
    elif is_credit is False:
        category_types = [Category.Type.EXPENSE]

    return list(
        Category.objects.filter(
            Q(user=user) | Q(user__isnull=True),
            category_type__in=category_types,
            is_active=True,
        )
    )


def _preferred_category(categories, slugs, user):
    candidates = [category for category in categories if category.slug in slugs]
    if not candidates:
        return None

    return max(candidates, key=lambda category: category.user_id == user.id)


def _make_suggestion(category, confidence, source, matched_on):
    return CategorySuggestion(
        category_id=category.id,
        category_name=category.name,
        category_slug=category.slug,
        category_type=category.category_type,
        confidence=round(confidence, 2),
        source=source,
        matched_on=matched_on,
    )


def _suggest_from_history(user, normalized_description, categories):
    categories_by_id = {category.id: category for category in categories}
    current_tokens = _merchant_tokens(normalized_description)
    matches = {}

    history = (
        Transaction.objects.filter(
            account__user=user,
            category_id__in=categories_by_id,
            category__is_active=True,
        )
        .exclude(description="")
        .values("category_id", "description")
        .order_by("-timestamp", "-id")[:HISTORY_LIMIT]
    )

    for item in history:
        historical_description = _normalize(item["description"])
        if not historical_description:
            continue

        if historical_description == normalized_description:
            confidence = 0.99
            matched_on = historical_description
        else:
            historical_tokens = _merchant_tokens(historical_description)
            if not current_tokens or not historical_tokens:
                continue

            shared_tokens = current_tokens & historical_tokens
            overlap = len(shared_tokens) / min(len(current_tokens), len(historical_tokens))
            if not shared_tokens or overlap < 0.75:
                continue

            confidence = min(0.95, 0.86 + (overlap * 0.08))
            matched_on = " ".join(sorted(shared_tokens))

        category_id = item["category_id"]
        previous = matches.get(category_id)
        if previous is None:
            matches[category_id] = [confidence, 1, matched_on]
        else:
            previous[0] = max(previous[0], confidence)
            previous[1] += 1

    if not matches:
        return None

    category_id, (confidence, match_count, matched_on) = max(
        matches.items(),
        key=lambda item: (item[1][0] + min(item[1][1], 5) * 0.01, item[1][1]),
    )
    confidence = min(0.99, confidence + min(match_count - 1, 4) * 0.01)
    return _make_suggestion(
        categories_by_id[category_id],
        confidence,
        "user_history",
        matched_on,
    )


def _suggest_from_keywords(user, normalized_description, categories):
    candidates = []

    for rule in KEYWORD_RULES:
        category = _preferred_category(categories, rule.category_slugs, user)
        if category is None:
            continue

        matched_keywords = [
            keyword
            for keyword in rule.keywords
            if _contains_phrase(normalized_description, keyword)
        ]
        if matched_keywords:
            confidence = min(0.92, 0.78 + len(matched_keywords) * 0.04)
            best_keyword = max(matched_keywords, key=len)
            candidates.append(
                _make_suggestion(category, confidence, "keyword", best_keyword)
            )

    ignored_slugs = {"other-income", "other-expense"}
    for category in categories:
        if category.slug in ignored_slugs:
            continue
        if _contains_phrase(normalized_description, category.name):
            candidates.append(
                _make_suggestion(category, 0.74, "category_name", category.name)
            )

    if not candidates:
        return None

    return max(candidates, key=lambda suggestion: suggestion.confidence)


def suggest_category(*, user, description: str, is_credit: bool | None = None):
    """Return the best visible category suggestion, or ``None`` when unknown."""

    normalized_description = _normalize(description)
    if not normalized_description:
        return None

    categories = _visible_categories(user, is_credit)
    if not categories:
        return None

    history_suggestion = _suggest_from_history(
        user,
        normalized_description,
        categories,
    )
    if history_suggestion is not None:
        return history_suggestion

    return _suggest_from_keywords(user, normalized_description, categories)


__all__ = ["CategorySuggestion", "suggest_category"]
