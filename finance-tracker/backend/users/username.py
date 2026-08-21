"""Canonical username policy used by every identity boundary."""

import re
import unicodedata


MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 30
USERNAME_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9._-]{1,28}[a-z0-9])?$")
RESERVED_IDENTITIES = frozenset({"root", "admin", "administrator", "system"})

# These are the common cross-script substitutions used in administrative spoofing.
# Usernames otherwise remain ASCII-only, so this mapping is deliberately narrow.
CONFUSABLES = str.maketrans(
    {
        "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "х": "x", "у": "y",
        "Α": "a", "α": "a", "Ε": "e", "ε": "e", "Ο": "o", "ο": "o",
        "Ρ": "p", "ρ": "p", "Ι": "i", "ι": "i", "Μ": "m", "μ": "m",
        "Ѕ": "s", "ѕ": "s", "Τ": "t", "τ": "t",
    }
)
SEPARATOR_PATTERN = re.compile(r"[._-]+")


class UsernamePolicyError(ValueError):
    """A safe, user-facing username validation failure."""


def _normalized_text(value):
    if not isinstance(value, str):
        raise UsernamePolicyError("Username is required.")
    return unicodedata.normalize("NFKC", value).strip().casefold()


def canonicalize_username(value):
    """Return the lookup/uniqueness key without applying new-user policy."""
    return _normalized_text(value)


def username_skeleton(value):
    """Return a separator-insensitive skeleton for reserved-name protection."""
    return SEPARATOR_PATTERN.sub("", _normalized_text(value).translate(CONFUSABLES))


def _is_reserved(value):
    skeleton = username_skeleton(value)
    if skeleton in RESERVED_IDENTITIES:
        return True
    # Block obvious administrative forms such as ``admin-user`` while allowing
    # ordinary names such as ``administratorly``.
    segments = [segment for segment in SEPARATOR_PATTERN.split(_normalized_text(value)) if segment]
    return any(segment.translate(CONFUSABLES) in RESERVED_IDENTITIES for segment in segments)


def normalize_username(value):
    """Normalize and validate a username, returning its canonical stored form.

    Policy: 3-30 characters, lowercase ASCII letters/digits plus ``.``, ``_`` and
    ``-``; separators may not lead or trail; leading/trailing whitespace is
    trimmed and internal whitespace is rejected. Unicode is NFKC-normalized
    before validation, and reserved/confusable administrative identities are
    unavailable.
    """
    normalized = _normalized_text(value)
    if _is_reserved(normalized):
        raise UsernamePolicyError("This username is reserved.")
    if len(normalized) < MIN_USERNAME_LENGTH:
        raise UsernamePolicyError("Username is too short.")
    if len(normalized) > MAX_USERNAME_LENGTH:
        raise UsernamePolicyError("Username is too long.")
    if any(character.isspace() for character in normalized):
        raise UsernamePolicyError("Username cannot contain spaces.")
    if not USERNAME_PATTERN.fullmatch(normalized):
        raise UsernamePolicyError("Username contains unsupported characters.")
    return normalized
