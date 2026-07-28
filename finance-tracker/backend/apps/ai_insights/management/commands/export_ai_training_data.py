import argparse
from datetime import date
import json
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

from apps.ai_insights.services.training_export import (
    TrainingExportError,
    export_training_data,
)


DEFAULT_SALT_ENVIRONMENT_VARIABLE = "FINTRACK_TRAINING_EXPORT_SALT"


def _iso_date(value):
    try:
        return date.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Use a date in YYYY-MM-DD format.") from exc


class Command(BaseCommand):
    help = "Export pseudonymous transaction rows for offline ML experiments."

    def add_arguments(self, parser):
        parser.add_argument("--output", required=True, help="Destination JSONL path.")
        scope = parser.add_mutually_exclusive_group(required=True)
        scope.add_argument(
            "--user-id",
            action="append",
            type=int,
            dest="user_ids",
            help="User ID to export. Repeat to include multiple users.",
        )
        scope.add_argument(
            "--all-users",
            action="store_true",
            help="Explicitly export all users.",
        )
        parser.add_argument("--start-date", type=_iso_date)
        parser.add_argument("--end-date", type=_iso_date)
        parser.add_argument("--overwrite", action="store_true")
        parser.add_argument(
            "--include-descriptions",
            action="store_true",
            help="Include normalized raw descriptions, which may contain sensitive data.",
        )
        parser.add_argument(
            "--acknowledge-sensitive-data",
            action="store_true",
            help="Required together with --include-descriptions.",
        )
        parser.add_argument(
            "--salt-env",
            default=DEFAULT_SALT_ENVIRONMENT_VARIABLE,
            help="Environment variable containing the export pseudonymization salt.",
        )

    def handle(self, *args, **options):
        if options["include_descriptions"] and not options[
            "acknowledge_sensitive_data"
        ]:
            raise CommandError(
                "--include-descriptions requires --acknowledge-sensitive-data."
            )

        salt_environment_variable = options["salt_env"]
        salt = os.environ.get(salt_environment_variable)
        if not salt:
            raise CommandError(
                f"Set {salt_environment_variable} to a private export salt first."
            )

        user_ids = options.get("user_ids")
        if user_ids:
            existing_ids = set(
                get_user_model()
                .objects.filter(id__in=user_ids)
                .values_list("id", flat=True)
            )
            missing_ids = sorted(set(user_ids) - existing_ids)
            if missing_ids:
                raise CommandError(f"Unknown user IDs: {missing_ids}.")

        try:
            result = export_training_data(
                output_path=options["output"],
                salt=salt,
                user_ids=None if options["all_users"] else user_ids,
                start_date=options["start_date"],
                end_date=options["end_date"],
                include_descriptions=options["include_descriptions"],
                overwrite=options["overwrite"],
            )
        except (OSError, TrainingExportError) as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS(json.dumps(result.as_dict(), indent=2)))
