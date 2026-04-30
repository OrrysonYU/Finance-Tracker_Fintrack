from decimal import Decimal

import django.core.validators
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0009_add_ledger_balance_service_contract"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="savinggoal",
            options={"ordering": ["deadline", "name"]},
        ),
        migrations.AddField(
            model_name="savinggoal",
            name="currency",
            field=models.CharField(default="KES", max_length=3),
        ),
        migrations.AddField(
            model_name="savinggoal",
            name="description",
            field=models.TextField(blank=True, default=""),
        ),
        migrations.AddField(
            model_name="savinggoal",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="savinggoal",
            name="current_amount",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=12,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.00")),
                ],
            ),
        ),
        migrations.AlterField(
            model_name="savinggoal",
            name="target_amount",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01")),
                ],
            ),
        ),
        migrations.AddIndex(
            model_name="savinggoal",
            index=models.Index(
                fields=["user", "deadline"],
                name="goal_user_deadline_idx",
            ),
        ),
    ]
