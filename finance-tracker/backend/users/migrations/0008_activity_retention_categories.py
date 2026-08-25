from datetime import timedelta

from django.db import migrations, models
from django.utils import timezone


RETENTION_DAYS = 180
SECURITY_ACTIVITY_LIMIT = 100
LOGIN_FAILURE_ACTIVITY_LIMIT = 25


def prune_existing_activity(apps, schema_editor):
    AuthenticationActivity = apps.get_model("users", "AuthenticationActivity")
    cutoff = timezone.now() - timedelta(days=RETENTION_DAYS)
    last_user_id = 0
    while True:
        user_id = (
            AuthenticationActivity.objects.filter(user_id__gt=last_user_id)
            .order_by("user_id")
            .values_list("user_id", flat=True)
            .first()
        )
        if user_id is None:
            break
        AuthenticationActivity.objects.filter(user_id=user_id, occurred_at__lt=cutoff).delete()
        for is_failure, limit in (
            (True, LOGIN_FAILURE_ACTIVITY_LIMIT),
            (False, SECURITY_ACTIVITY_LIMIT),
        ):
            queryset = AuthenticationActivity.objects.filter(user_id=user_id)
            if is_failure:
                queryset = queryset.filter(event_type="login_failure")
            else:
                queryset = queryset.exclude(event_type="login_failure")
            stale_ids = list(
                queryset.order_by("-occurred_at", "-id").values_list("id", flat=True)[limit:]
            )
            if stale_ids:
                AuthenticationActivity.objects.filter(user_id=user_id, id__in=stale_ids).delete()
        last_user_id = user_id


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0007_usersession_authenticationactivity_and_more"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="authenticationactivity",
            index=models.Index(
                fields=["user", "event_type", "occurred_at"],
                name="users_authe_user_id_6803d3_idx",
            ),
        ),
        migrations.RunPython(prune_existing_activity, migrations.RunPython.noop),
    ]
