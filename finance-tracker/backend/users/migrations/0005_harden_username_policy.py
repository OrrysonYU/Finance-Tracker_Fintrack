from django.db import migrations, models
import users.username


def populate_username_canonical(apps, schema_editor):
    User = apps.get_model("users", "User")
    seen = {}
    for user in User.objects.order_by("pk").iterator():
        canonical = users.username.canonicalize_username(user.username)
        previous = seen.get(canonical)
        if previous is not None and previous != user.pk:
            raise RuntimeError(
                f"Username collision during migration for canonical username {canonical!r}: "
                f"user ids {previous} and {user.pk}. Resolve manually; accounts were not merged."
            )
        seen[canonical] = user.pk
        User.objects.filter(pk=user.pk).update(username_canonical=canonical)


class Migration(migrations.Migration):
    dependencies = [("users", "0004_user_auth_epoch_revokedtoken")]
    operations = [
        migrations.AddField(
            model_name="user",
            name="username_canonical",
            field=models.CharField(editable=False, max_length=150, null=True, unique=True),
        ),
        migrations.RunPython(populate_username_canonical, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="user",
            name="username_canonical",
            field=models.CharField(
                editable=False,
                help_text="NFKC/case-folded identity key used for lookup and uniqueness.",
                max_length=150,
                unique=True,
            ),
        ),
    ]
