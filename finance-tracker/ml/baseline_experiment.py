"""Validate a Fintrack JSONL export and prepare leakage-safe split statistics.

This standard-library scaffold intentionally trains no model. Add experiment-only
dependencies inside this directory when an approved ML project begins.
"""

from __future__ import annotations

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path


SCHEMA_VERSION = "fintrack.transaction.v1"
REQUIRED_FIELDS = {
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
}


def split_for_user(user_key):
    bucket = int(hashlib.sha256(user_key.encode()).hexdigest()[:8], 16) % 10
    if bucket == 0:
        return "test"
    if bucket == 1:
        return "validation"
    return "train"


def inspect_export(path):
    split_counts = Counter()
    category_counts = Counter()
    currency_counts = Counter()
    user_splits = {}
    row_count = 0

    with path.open(encoding="utf-8") as source:
        for line_number, line in enumerate(source, start=1):
            if not line.strip():
                continue
            row = json.loads(line)
            missing = REQUIRED_FIELDS - row.keys()
            if missing:
                raise ValueError(
                    f"Line {line_number} is missing fields: {sorted(missing)}"
                )
            if row["schema_version"] != SCHEMA_VERSION:
                raise ValueError(
                    f"Line {line_number} uses unsupported schema "
                    f"{row['schema_version']!r}."
                )

            user_key = row["user_key"]
            split = split_for_user(user_key)
            previous_split = user_splits.setdefault(user_key, split)
            if previous_split != split:
                raise AssertionError("A user was assigned to multiple dataset splits.")

            split_counts[split] += 1
            currency_counts[row["currency"]] += 1
            category_counts[row["category_slug"] or "<unlabeled>"] += 1
            row_count += 1

    return {
        "schema_version": SCHEMA_VERSION,
        "rows": row_count,
        "users": len(user_splits),
        "rows_by_split": dict(sorted(split_counts.items())),
        "rows_by_currency": dict(sorted(currency_counts.items())),
        "top_categories": category_counts.most_common(20),
    }


def main():
    parser = argparse.ArgumentParser(
        description="Validate an export and report leakage-safe dataset splits."
    )
    parser.add_argument("--input", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(inspect_export(args.input), indent=2))


if __name__ == "__main__":
    main()
