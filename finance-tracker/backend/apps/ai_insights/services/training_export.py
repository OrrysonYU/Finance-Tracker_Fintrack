"""Offline, privacy-conscious export contract for future ML experiments."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import timezone as datetime_timezone
import hashlib
import hmac
import json
import os
from pathlib import Path
import tempfile

from django.utils import timezone

from finance.models import Transaction


SCHEMA_VERSION = "fintrack.transaction.v1"
MINIMUM_SALT_LENGTH = 16
EXPORT_FIELDS = (
    "schema_version",
    "record_key",
    "user_key",
    "occurred_at",
    "local_date",
    "amount",
    "currency",
    "direction",
    "account_type",
    "category_slug",
    "category_type",
    "description",
)


class TrainingExportError(ValueError):
    """Raised when an offline export cannot be produced safely."""


@dataclass(frozen=True, slots=True)
class TrainingExportResult:
    output_path: str
    schema_version: str
    row_count: int
    descriptions_included: bool
    sha256: str

    def as_dict(self):
        return asdict(self)


def _validate_salt(salt):
    if not isinstance(salt, str) or len(salt) < MINIMUM_SALT_LENGTH:
        raise TrainingExportError(
            f"Export salt must contain at least {MINIMUM_SALT_LENGTH} characters."
        )


def _pseudonymous_key(salt, namespace, value):
    message = f"{namespace}:{value}".encode()
    return hmac.new(salt.encode(), message, hashlib.sha256).hexdigest()


def _normalized_description(description):
    return " ".join((description or "").split()) or None


def _utc_timestamp(value):
    if timezone.is_naive(value):
        value = timezone.make_aware(value)
    return value.astimezone(datetime_timezone.utc).isoformat().replace("+00:00", "Z")


def _training_row(transaction, *, salt, include_descriptions):
    category = transaction.category
    return {
        "schema_version": SCHEMA_VERSION,
        "record_key": _pseudonymous_key(salt, "transaction", transaction.id),
        "user_key": _pseudonymous_key(salt, "user", transaction.account.user_id),
        "occurred_at": _utc_timestamp(transaction.timestamp),
        "local_date": timezone.localtime(transaction.timestamp).date().isoformat(),
        "amount": f"{transaction.amount:.2f}",
        "currency": transaction.account.currency,
        "direction": "credit" if transaction.is_credit else "debit",
        "account_type": transaction.account.type,
        "category_slug": category.slug if category else None,
        "category_type": category.category_type if category else None,
        "description": (
            _normalized_description(transaction.description)
            if include_descriptions
            else None
        ),
    }


def _training_queryset(*, user_ids=None, start_date=None, end_date=None):
    queryset = Transaction.objects.select_related(
        "account",
        "account__user",
        "category",
    ).order_by("timestamp", "id")
    if user_ids is not None:
        queryset = queryset.filter(account__user_id__in=user_ids)
    if start_date is not None:
        queryset = queryset.filter(timestamp__date__gte=start_date)
    if end_date is not None:
        queryset = queryset.filter(timestamp__date__lte=end_date)
    return queryset


def export_training_data(
    *,
    output_path,
    salt,
    user_ids=None,
    start_date=None,
    end_date=None,
    include_descriptions=False,
    overwrite=False,
):
    """Write transaction training rows as an atomic, versioned JSONL export."""

    _validate_salt(salt)
    if start_date and end_date and start_date > end_date:
        raise TrainingExportError("start_date must be on or before end_date.")

    destination = Path(output_path).expanduser().resolve()
    if destination.exists() and destination.is_dir():
        raise TrainingExportError(f"Output path is a directory: {destination}.")
    if destination.exists() and not overwrite:
        raise TrainingExportError(
            f"Output already exists: {destination}. Use overwrite explicitly."
        )

    destination.parent.mkdir(parents=True, exist_ok=True)
    checksum = hashlib.sha256()
    row_count = 0
    temporary_path = None
    queryset = _training_queryset(
        user_ids=user_ids,
        start_date=start_date,
        end_date=end_date,
    )

    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            newline="\n",
            dir=destination.parent,
            prefix=f".{destination.name}.",
            suffix=".tmp",
            delete=False,
        ) as temporary_file:
            temporary_path = Path(temporary_file.name)
            for transaction in queryset.iterator(chunk_size=1000):
                row = _training_row(
                    transaction,
                    salt=salt,
                    include_descriptions=include_descriptions,
                )
                serialized = json.dumps(row, separators=(",", ":"), sort_keys=False)
                line = f"{serialized}\n"
                temporary_file.write(line)
                checksum.update(line.encode())
                row_count += 1

        os.replace(temporary_path, destination)
    except Exception:
        if temporary_path and temporary_path.exists():
            temporary_path.unlink()
        raise

    return TrainingExportResult(
        output_path=str(destination),
        schema_version=SCHEMA_VERSION,
        row_count=row_count,
        descriptions_included=include_descriptions,
        sha256=checksum.hexdigest(),
    )


__all__ = [
    "EXPORT_FIELDS",
    "SCHEMA_VERSION",
    "TrainingExportError",
    "TrainingExportResult",
    "export_training_data",
]
