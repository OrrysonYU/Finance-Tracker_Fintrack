"""Deterministic detection of unusually large expense transactions."""

from __future__ import annotations

from collections import defaultdict, deque
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from finance.models import Transaction
from reports.services.monthly_summary import money


ZERO = Decimal("0.00")
MIN_CATEGORY_SAMPLES = 5
MIN_OVERALL_SAMPLES = 10
CATEGORY_HISTORY_SIZE = 50
OVERALL_HISTORY_SIZE = 100
PRIOR_HISTORY_LIMIT = 500
DEFAULT_LOOKBACK_DAYS = 90
MAX_LOOKBACK_DAYS = 365
DEFAULT_ANOMALY_LIMIT = 20
MAX_ANOMALY_LIMIT = 100
Z_SCORE_THRESHOLD = Decimal("3.00")
MIN_AMOUNT_MULTIPLIER = Decimal("1.50")
ZERO_DEVIATION_MULTIPLIER = Decimal("3.00")


def _statistics(amounts):
    sample_size = len(amounts)
    mean = sum(amounts, ZERO) / Decimal(sample_size)
    variance = sum((amount - mean) ** 2 for amount in amounts) / Decimal(
        sample_size
    )
    return mean, variance.sqrt()


def _evaluate_amount(amount, amounts):
    mean, standard_deviation = _statistics(amounts)
    amount_ratio = amount / mean

    if standard_deviation == ZERO:
        threshold = mean * ZERO_DEVIATION_MULTIPLIER
        score = amount_ratio
    else:
        statistical_threshold = mean + (Z_SCORE_THRESHOLD * standard_deviation)
        relative_threshold = mean * MIN_AMOUNT_MULTIPLIER
        threshold = max(statistical_threshold, relative_threshold)
        score = (amount - mean) / standard_deviation

    if amount < threshold:
        return None

    return {
        "sample_size": len(amounts),
        "mean_amount": money(mean),
        "standard_deviation": money(standard_deviation),
        "threshold_amount": money(threshold),
        "amount_ratio": amount_ratio.quantize(Decimal("0.01")),
        "deviation_score": score.quantize(Decimal("0.01")),
    }


def _severity(evidence):
    if (
        evidence["deviation_score"] >= Decimal("6.00")
        or evidence["amount_ratio"] >= Decimal("5.00")
    ):
        return "critical"
    return "high"


def _transaction_date(transaction):
    return timezone.localtime(transaction.timestamp).date()


def _anomaly_payload(transaction, *, baseline_scope, evidence, category_samples):
    category_name = (
        transaction.category.name if transaction.category else "Uncategorized"
    )
    currency = transaction.account.currency
    amount = money(transaction.amount)

    if baseline_scope == "category":
        reason = "category_amount_outlier"
        explanation = (
            f"{currency} {amount:,.2f} in {category_name} is "
            f"{evidence['amount_ratio']:.1f}x the average of "
            f"{currency} {evidence['mean_amount']:,.2f} across "
            f"{evidence['sample_size']} earlier transactions in this category."
        )
    else:
        reason = "rare_category_amount_outlier"
        explanation = (
            f"{currency} {amount:,.2f} in {category_name} is unusually large "
            f"compared with {evidence['sample_size']} earlier expenses in this "
            f"currency; only {category_samples} earlier transactions were recorded "
            "in this category."
        )

    return {
        "transaction_id": transaction.id,
        "timestamp": transaction.timestamp,
        "description": transaction.description,
        "amount": amount,
        "currency": currency,
        "account_id": transaction.account_id,
        "account_name": transaction.account.name,
        "category_id": transaction.category_id,
        "category_name": category_name,
        "reason": reason,
        "severity": _severity(evidence),
        "explanation": explanation,
        "baseline": {
            "scope": baseline_scope,
            **evidence,
            "category_sample_size": category_samples,
        },
    }


def _expense_queryset(user):
    return Transaction.objects.select_related("account", "category").filter(
        account__user=user,
        is_credit=False,
    )


def detect_anomalies(
    user,
    *,
    as_of=None,
    days=DEFAULT_LOOKBACK_DAYS,
    limit=DEFAULT_ANOMALY_LIMIT,
):
    """Find high-side amount outliers without mixing categories or currencies."""

    if not 1 <= days <= MAX_LOOKBACK_DAYS:
        raise ValueError(f"days must be between 1 and {MAX_LOOKBACK_DAYS}.")
    if not 1 <= limit <= MAX_ANOMALY_LIMIT:
        raise ValueError(f"limit must be between 1 and {MAX_ANOMALY_LIMIT}.")

    as_of = as_of or timezone.localdate()
    window_start = as_of - timedelta(days=days - 1)
    expenses = _expense_queryset(user)
    prior_transactions = list(
        expenses.filter(timestamp__date__lt=window_start)
        .order_by("-timestamp", "-id")[:PRIOR_HISTORY_LIMIT]
    )
    prior_transactions.reverse()
    candidate_transactions = list(
        expenses.filter(
            timestamp__date__gte=window_start,
            timestamp__date__lte=as_of,
        ).order_by("timestamp", "id")
    )

    category_history = defaultdict(lambda: deque(maxlen=CATEGORY_HISTORY_SIZE))
    currency_history = defaultdict(lambda: deque(maxlen=OVERALL_HISTORY_SIZE))
    anomalies = []

    for transaction in [*prior_transactions, *candidate_transactions]:
        amount = money(transaction.amount)
        currency = transaction.account.currency
        category_key = (currency, transaction.category_id)
        category_amounts = category_history[category_key]
        overall_amounts = currency_history[currency]
        evidence = None
        baseline_scope = None

        if len(category_amounts) >= MIN_CATEGORY_SAMPLES:
            evidence = _evaluate_amount(amount, category_amounts)
            baseline_scope = "category"
        elif len(overall_amounts) >= MIN_OVERALL_SAMPLES:
            evidence = _evaluate_amount(amount, overall_amounts)
            baseline_scope = "overall"

        is_candidate = _transaction_date(transaction) >= window_start
        if evidence is not None:
            if is_candidate:
                anomalies.append(
                    _anomaly_payload(
                        transaction,
                        baseline_scope=baseline_scope,
                        evidence=evidence,
                        category_samples=len(category_amounts),
                    )
                )
            # Do not let a detected outlier distort subsequent baselines.
            continue

        category_amounts.append(amount)
        overall_amounts.append(amount)

    anomalies.sort(
        key=lambda anomaly: (
            anomaly["baseline"]["deviation_score"],
            anomaly["amount"],
            anomaly["timestamp"],
        ),
        reverse=True,
    )
    anomalies = anomalies[:limit]

    return {
        "as_of": as_of,
        "window": {
            "start": window_start,
            "end": as_of,
            "days": days,
        },
        "transaction_count_analyzed": len(candidate_transactions),
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
    }


detect_transaction_anomalies = detect_anomalies


__all__ = [
    "DEFAULT_ANOMALY_LIMIT",
    "DEFAULT_LOOKBACK_DAYS",
    "MAX_ANOMALY_LIMIT",
    "MAX_LOOKBACK_DAYS",
    "detect_anomalies",
    "detect_transaction_anomalies",
]
