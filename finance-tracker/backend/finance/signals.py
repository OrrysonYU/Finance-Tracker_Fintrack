from django.db.models.signals import post_save, post_delete, pre_save
from django.dispatch import receiver
from .models import Transaction

def _apply_delta(account, amount, is_credit):
    if is_credit:
        account.balance = (account.balance or 0) + amount
    else:
        account.balance = (account.balance or 0) - amount
    account.save(update_fields=["balance"])

def _reverse_delta(account, amount, is_credit):
    # undo previous effect
    _apply_delta(account, amount, not is_credit)

@receiver(pre_save, sender=Transaction)
def handle_transaction_update(sender, instance, **kwargs):
    if not instance.pk:
        return  # creating, handled in post_save
    try:
        old = Transaction.objects.get(pk=instance.pk)
    except Transaction.DoesNotExist:
        return
    # If any of these changed, reverse old and apply new
    if (old.amount != instance.amount) or (old.is_credit != instance.is_credit) or (old.account_id != instance.account_id):
        _reverse_delta(old.account, old.amount, old.is_credit)

@receiver(post_save, sender=Transaction)
def handle_transaction_create_or_update(sender, instance, created, **kwargs):
    # For create, apply new effect; for update, pre_save already reversed old, so reapply new
    _apply_delta(instance.account, instance.amount, instance.is_credit)

@receiver(post_delete, sender=Transaction)
def handle_transaction_delete(sender, instance, **kwargs):
    _reverse_delta(instance.account, instance.amount, instance.is_credit)
