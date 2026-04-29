from decimal import Decimal

import django.core.validators
import django.utils.timezone
from django.db import migrations, models
from django.db.models import Q, Sum


ZERO = Decimal("0.00")


def preserve_opening_balances(apps, schema_editor):
    Account = apps.get_model("finance", "Account")
    Transaction = apps.get_model("finance", "Transaction")

    for account in Account.objects.all().iterator():
        totals = Transaction.objects.filter(account_id=account.pk).aggregate(
            credits=Sum("amount", filter=Q(is_credit=True)),
            debits=Sum("amount", filter=Q(is_credit=False)),
        )
        credits = totals["credits"] or ZERO
        debits = totals["debits"] or ZERO
        opening_balance = (account.balance or ZERO) - credits + debits
        Account.objects.filter(pk=account.pk).update(opening_balance=opening_balance)


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0008_rebuild_account_contract"),
    ]

    operations = [
        migrations.AddField(
            model_name="account",
            name="opening_balance",
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                max_digits=15,
            ),
        ),
        migrations.RunPython(
            preserve_opening_balances,
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="transaction",
            name="amount",
            field=models.DecimalField(
                decimal_places=2,
                max_digits=12,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01")),
                ],
            ),
        ),
        migrations.AddField(
            model_name="transaction",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddIndex(
            model_name="transaction",
            index=models.Index(
                fields=["account", "-timestamp"],
                name="txn_account_time_idx",
            ),
        ),
    ]

