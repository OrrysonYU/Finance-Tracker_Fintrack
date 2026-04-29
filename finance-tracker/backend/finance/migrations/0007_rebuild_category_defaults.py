import django.utils.timezone
from django.db import migrations, models
from django.db.models import Q
from django.utils.text import slugify


def populate_category_slugs(apps, schema_editor):
    Category = apps.get_model("finance", "Category")

    for category in Category.objects.all():
        category.slug = slugify(category.name)
        category.category_type = category.category_type or "EXPENSE"
        category.save(update_fields=["slug", "category_type"])


class Migration(migrations.Migration):

    dependencies = [
        ("finance", "0006_alter_transaction_options_and_more"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="category",
            options={
                "ordering": ["category_type", "name"],
                "verbose_name_plural": "categories",
            },
        ),
        migrations.AddField(
            model_name="category",
            name="category_type",
            field=models.CharField(
                choices=[
                    ("INCOME", "Income"),
                    ("EXPENSE", "Expense"),
                    ("TRANSFER", "Transfer"),
                ],
                default="EXPENSE",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="category",
            name="created_at",
            field=models.DateTimeField(
                auto_now_add=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="category",
            name="is_active",
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name="category",
            name="slug",
            field=models.SlugField(blank=True, default="", max_length=100),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="category",
            name="updated_at",
            field=models.DateTimeField(
                auto_now=True,
                default=django.utils.timezone.now,
            ),
            preserve_default=False,
        ),
        migrations.AlterField(
            model_name="category",
            name="name",
            field=models.CharField(max_length=80),
        ),
        migrations.RunPython(populate_category_slugs, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                condition=Q(user__isnull=True),
                fields=("slug", "category_type"),
                name="unique_default_category_slug_type",
            ),
        ),
        migrations.AddConstraint(
            model_name="category",
            constraint=models.UniqueConstraint(
                condition=Q(user__isnull=False),
                fields=("user", "slug", "category_type"),
                name="unique_user_category_slug_type",
            ),
        ),
    ]
