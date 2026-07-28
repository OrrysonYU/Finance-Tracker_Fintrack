from datetime import datetime
from decimal import Decimal
from io import StringIO
import json
import os
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase, override_settings
from django.utils import timezone

from apps.ai_insights.services.training_export import (
    EXPORT_FIELDS,
    SCHEMA_VERSION,
    TrainingExportError,
    export_training_data,
)
from finance.models import Account, Category
from finance.services import balance_service
from finance.tests import FAST_PASSWORD_HASHERS


User = get_user_model()
EXPORT_SALT = "test-only-private-export-salt"


@override_settings(PASSWORD_HASHERS=FAST_PASSWORD_HASHERS)
class TrainingExportTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="export_owner",
            email="private-owner@example.com",
            password="StrongPass123!",
        )
        self.other_user = User.objects.create_user(
            username="export_other",
            email="private-other@example.com",
            password="StrongPass123!",
        )
        self.account = Account.objects.create(
            user=self.user,
            name="Private account name",
            type=Account.Type.BANK,
            currency="KES",
        )
        self.other_account = Account.objects.create(
            user=self.other_user,
            name="Other private account",
            type=Account.Type.CASH,
            currency="USD",
        )
        self.groceries = Category.objects.create(
            name="Groceries",
            category_type=Category.Type.EXPENSE,
        )
        self.transaction = balance_service.create_transaction(
            account=self.account,
            category=self.groceries,
            amount=Decimal("42.50"),
            description="  Merchant   reference 123  ",
            timestamp=self.timestamp(2026, 7, 10),
        )
        balance_service.create_transaction(
            account=self.other_account,
            category=self.groceries,
            amount=Decimal("99.00"),
            description="Other user's merchant",
            timestamp=self.timestamp(2026, 7, 11),
        )

    def timestamp(self, year, month, day):
        return timezone.make_aware(datetime(year, month, day, 12, 0))

    def read_rows(self, path):
        return [json.loads(line) for line in path.read_text().splitlines()]

    def test_export_is_scoped_versioned_and_pseudonymous_by_default(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "training.jsonl"

            result = export_training_data(
                output_path=output,
                salt=EXPORT_SALT,
                user_ids=[self.user.id],
            )
            rows = self.read_rows(output)

        self.assertEqual(result.row_count, 1)
        self.assertEqual(result.schema_version, SCHEMA_VERSION)
        self.assertEqual(len(result.sha256), 64)
        self.assertEqual(len(rows), 1)
        row = rows[0]
        self.assertEqual(tuple(row), EXPORT_FIELDS)
        self.assertEqual(row["schema_version"], SCHEMA_VERSION)
        self.assertEqual(row["amount"], "42.50")
        self.assertEqual(row["currency"], "KES")
        self.assertEqual(row["direction"], "debit")
        self.assertEqual(row["category_slug"], "groceries")
        self.assertIsNone(row["description"])
        self.assertEqual(len(row["record_key"]), 64)
        self.assertEqual(len(row["user_key"]), 64)
        serialized = json.dumps(row)
        self.assertNotEqual(row["record_key"], str(self.transaction.id))
        self.assertNotIn(self.user.email, serialized)
        self.assertNotIn(self.account.name, serialized)
        self.assertNotIn("Merchant", serialized)

    def test_description_export_requires_an_explicit_service_option(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "training.jsonl"

            result = export_training_data(
                output_path=output,
                salt=EXPORT_SALT,
                user_ids=[self.user.id],
                include_descriptions=True,
            )
            row = self.read_rows(output)[0]

        self.assertTrue(result.descriptions_included)
        self.assertEqual(row["description"], "Merchant reference 123")

    def test_export_respects_date_filters(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "training.jsonl"

            result = export_training_data(
                output_path=output,
                salt=EXPORT_SALT,
                user_ids=[self.user.id],
                start_date=self.timestamp(2026, 7, 11).date(),
            )

        self.assertEqual(result.row_count, 0)

    def test_export_refuses_weak_salt_existing_output_and_invalid_range(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "training.jsonl"
            output.write_text("existing")

            with self.assertRaises(TrainingExportError):
                export_training_data(
                    output_path=output,
                    salt=EXPORT_SALT,
                    user_ids=[self.user.id],
                )
            with self.assertRaises(TrainingExportError):
                export_training_data(
                    output_path=Path(directory) / "weak.jsonl",
                    salt="short",
                    user_ids=[self.user.id],
                )
            with self.assertRaises(TrainingExportError):
                export_training_data(
                    output_path=Path(directory) / "range.jsonl",
                    salt=EXPORT_SALT,
                    start_date=self.timestamp(2026, 7, 12).date(),
                    end_date=self.timestamp(2026, 7, 1).date(),
                )

    def test_same_salt_produces_stable_keys_without_exposing_ids(self):
        with TemporaryDirectory() as directory:
            first_output = Path(directory) / "first.jsonl"
            second_output = Path(directory) / "second.jsonl"
            third_output = Path(directory) / "third.jsonl"

            export_training_data(
                output_path=first_output,
                salt=EXPORT_SALT,
                user_ids=[self.user.id],
            )
            export_training_data(
                output_path=second_output,
                salt=EXPORT_SALT,
                user_ids=[self.user.id],
            )
            export_training_data(
                output_path=third_output,
                salt="a-different-private-export-salt",
                user_ids=[self.user.id],
            )
            first = self.read_rows(first_output)[0]
            second = self.read_rows(second_output)[0]
            third = self.read_rows(third_output)[0]

        self.assertEqual(first["record_key"], second["record_key"])
        self.assertEqual(first["user_key"], second["user_key"])
        self.assertNotEqual(first["record_key"], third["record_key"])
        self.assertNotEqual(first["user_key"], third["user_key"])

    def test_management_command_exports_and_reports_summary(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "command.jsonl"
            stdout = StringIO()

            with patch.dict(
                os.environ,
                {"FINTRACK_TRAINING_EXPORT_SALT": EXPORT_SALT},
            ):
                call_command(
                    "export_ai_training_data",
                    "--output",
                    str(output),
                    "--user-id",
                    str(self.user.id),
                    stdout=stdout,
                )

            rows = self.read_rows(output)

        self.assertEqual(len(rows), 1)
        self.assertIn('"row_count": 1', stdout.getvalue())

    def test_management_command_guards_sensitive_descriptions_and_unknown_users(self):
        with TemporaryDirectory() as directory:
            output = Path(directory) / "command.jsonl"
            with patch.dict(
                os.environ,
                {"FINTRACK_TRAINING_EXPORT_SALT": EXPORT_SALT},
            ):
                with self.assertRaises(CommandError):
                    call_command(
                        "export_ai_training_data",
                        "--output",
                        str(output),
                        "--user-id",
                        str(self.user.id),
                        "--include-descriptions",
                    )
                with self.assertRaises(CommandError):
                    call_command(
                        "export_ai_training_data",
                        "--output",
                        str(output),
                        "--user-id",
                        "999999",
                    )
