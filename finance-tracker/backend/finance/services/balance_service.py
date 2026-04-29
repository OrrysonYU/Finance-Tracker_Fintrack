from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction as db_transaction
from django.db.models import Case, DecimalField, F, Sum, When

from finance.models import Account, Transaction


ZERO = Decimal("0.00")


def get_signed_amount(amount, is_credit):
    """Return the ledger effect of a transaction amount."""
    amount = Decimal(amount)
    return amount if is_credit else -amount


def calculate_account_balance(account):
    """Derive an account balance from opening balance plus transaction history."""
    totals = account.transactions.aggregate(
        total=Sum(
            Case(
                When(is_credit=True, then=F("amount")),
                default=-F("amount"),
                output_field=DecimalField(max_digits=15, decimal_places=2),
            )
        )
    )
    transaction_total = totals["total"] or ZERO
    return (account.opening_balance or ZERO) + transaction_total


def recalculate_account_balance(account):
    """Persist and return the current derived balance for one account."""
    account.balance = calculate_account_balance(account)
    account.save(update_fields=["balance", "updated_at"])
    return account


def sync_account_balance(account):
    """Public alias for callers that need a readable account-level sync action."""
    return recalculate_account_balance(account)


def create_transaction(
    *,
    account,
    amount,
    is_credit=False,
    description="",
    category=None,
    timestamp=None,
):
    """Create a transaction and explicitly recalculate the affected account."""
    amount = Decimal(amount)
    if amount <= ZERO:
        raise ValidationError("Transaction amount must be greater than zero.")

    create_kwargs = {
        "account": account,
        "amount": amount,
        "is_credit": is_credit,
        "description": description,
        "category": category,
    }
    if timestamp is not None:
        create_kwargs["timestamp"] = timestamp

    with db_transaction.atomic():
        ledger_entry = Transaction.objects.create(**create_kwargs)
        recalculate_account_balance(account)
        return ledger_entry


def update_transaction(ledger_entry, **changes):
    """Update a transaction and recalculate every affected account."""
    previous_account = ledger_entry.account

    with db_transaction.atomic():
        for field, value in changes.items():
            setattr(ledger_entry, field, value)
        ledger_entry.full_clean()
        ledger_entry.save()

        recalculate_account_balance(previous_account)
        if ledger_entry.account_id != previous_account.id:
            recalculate_account_balance(ledger_entry.account)

        return ledger_entry


def delete_transaction(ledger_entry):
    """Delete a transaction and explicitly recalculate its account."""
    account = ledger_entry.account

    with db_transaction.atomic():
        ledger_entry.delete()
        recalculate_account_balance(account)
        return account
