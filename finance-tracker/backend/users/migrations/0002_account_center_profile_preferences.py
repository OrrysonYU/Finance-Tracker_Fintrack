from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="country",
            field=models.CharField(
                blank=True,
                help_text="Country used for account context and regional defaults.",
                max_length=80,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="display_name",
            field=models.CharField(
                blank=True,
                help_text="Preferred name shown throughout Fintrack.",
                max_length=150,
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="notification_account_activity",
            field=models.BooleanField(
                default=True,
                help_text="Receive account notifications about important account activity.",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="notification_budget_updates",
            field=models.BooleanField(
                default=True,
                help_text="Receive account notifications about budget progress.",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="notification_goal_updates",
            field=models.BooleanField(
                default=True,
                help_text="Receive account notifications about saving goal progress.",
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="phone_number",
            field=models.CharField(
                blank=True,
                help_text="Optional account contact number.",
                max_length=32,
            ),
        ),
    ]
