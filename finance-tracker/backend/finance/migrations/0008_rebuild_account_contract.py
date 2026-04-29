import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0007_rebuild_category_defaults"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="account",
            options={"ordering": ["name"]},
        ),
        migrations.AddField(
            model_name="account",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddIndex(
            model_name="account",
            index=models.Index(
                fields=["user", "name"],
                name="account_user_name_idx",
            ),
        ),
    ]
