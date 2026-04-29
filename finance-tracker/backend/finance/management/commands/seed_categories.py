from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from finance.models import Category


DEFAULT_CATEGORIES = {
    Category.Type.INCOME: [
        "Salary",
        "Freelance",
        "Business",
        "Investments",
        "Gifts",
        "Refunds",
        "Other Income",
    ],
    Category.Type.EXPENSE: [
        "Housing",
        "Utilities",
        "Groceries",
        "Transport",
        "Dining",
        "Healthcare",
        "Insurance",
        "Education",
        "Entertainment",
        "Shopping",
        "Subscriptions",
        "Debt Payments",
        "Savings",
        "Taxes",
        "Travel",
        "Personal Care",
        "Family",
        "Other Expense",
    ],
    Category.Type.TRANSFER: [
        "Account Transfer",
        "Cash Withdrawal",
        "Cash Deposit",
    ],
}


class Command(BaseCommand):
    help = "Seed shared default finance categories safely."

    @transaction.atomic
    def handle(self, *args, **options):
        created_count = 0
        updated_count = 0

        for category_type, names in DEFAULT_CATEGORIES.items():
            for name in names:
                slug = slugify(name)
                category, created = Category.objects.update_or_create(
                    user=None,
                    slug=slug,
                    category_type=category_type,
                    defaults={
                        "name": name,
                        "is_active": True,
                    },
                )

                if created:
                    created_count += 1
                    self.stdout.write(f"Created default category: {category}")
                else:
                    updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Default categories ready "
                f"({created_count} created, {updated_count} updated)."
            )
        )
