# Optional ML workspace

This directory is an offline experimentation boundary. Nothing here is imported by the Django or React applications, and Fintrack has no runtime ML dependency.

## Starting an approved experiment

1. Export authorized data with the backend command documented in [`../backend/apps/ai_insights/README.md`](../backend/apps/ai_insights/README.md).
2. Keep the JSONL file outside the repository. Generated financial datasets must never be committed.
3. Validate the contract and inspect user-safe split counts:

   ```powershell
   python .\ml\baseline_experiment.py `
     --input .\private-exports\transactions-v1.jsonl
   ```

4. Create a dedicated experiment environment in `ml/.venv`; do not add ML libraries to the backend requirements.
5. Split records by `user_key`. The scaffold deterministically assigns users to 80% train, 10% validation, and 10% test buckets, preventing one person's transactions from leaking across splits.
6. Establish a simple frequency or keyword baseline before adding a learned model. Compare it with the current deterministic category suggester.

## Suggested experiment layout

```text
ml/
  README.md
  baseline_experiment.py
  experiments/       # code and configs; safe to commit after review
  artifacts/         # models and reports; ignored/local unless approved
  private-exports/   # sensitive JSONL files; never commit
```

Before any production handoff, document data lineage, consent and retention, label quality, currency handling, class imbalance, precision/recall by category, confidence calibration, drift monitoring, inference latency, rollback behavior, and the human-review experience. Model output must remain advisory and must never mutate the ledger without explicit user confirmation.
