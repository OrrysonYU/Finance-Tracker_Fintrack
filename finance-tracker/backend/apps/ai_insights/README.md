# AI Insights

Fintrack's runtime AI features are deterministic services. They produce category suggestions, spending observations, budget forecasts, and anomaly warnings without requiring an external model or changing ledger data.

The training export is an optional offline handoff. The application does not import an ML framework and does not read exported files at runtime.

## Training export

Exports use newline-delimited JSON (JSONL), one transaction per line. Choose a private, stable salt so records can be grouped between approved exports without exposing database identifiers. Never commit the salt or generated data.

PowerShell example for one user:

```powershell
$env:FINTRACK_TRAINING_EXPORT_SALT = "replace-with-at-least-16-private-characters"
python manage.py export_ai_training_data `
  --user-id 42 `
  --start-date 2026-01-01 `
  --output .\private-exports\transactions-v1.jsonl
```

Use `--all-users` only with explicit authorization. Existing files are protected unless `--overwrite` is supplied.

Descriptions are excluded by default because merchant text can contain names, locations, account references, or other sensitive information. Including them requires both flags:

```powershell
python manage.py export_ai_training_data `
  --user-id 42 `
  --output .\private-exports\transactions-with-text-v1.jsonl `
  --include-descriptions `
  --acknowledge-sensitive-data
```

## Schema: `fintrack.transaction.v1`

| Field | Type | Meaning |
| --- | --- | --- |
| `schema_version` | string | Contract version, currently `fintrack.transaction.v1`. |
| `record_key` | string | Salted HMAC of the transaction ID. |
| `user_key` | string | Salted HMAC used for user-safe dataset splitting. |
| `occurred_at` | ISO-8601 string | Transaction timestamp normalized to UTC. |
| `local_date` | ISO date | Date in the configured Fintrack timezone. |
| `amount` | decimal string | Unsigned transaction amount without floating-point loss. |
| `currency` | string | Account ISO currency code. Never mix currencies in features. |
| `direction` | enum | `credit` or `debit`. |
| `account_type` | enum | Non-identifying account type such as `BANK` or `CASH`. |
| `category_slug` | nullable string | Training label; null for uncategorized records. |
| `category_type` | nullable enum | `INCOME`, `EXPENSE`, or `TRANSFER`. |
| `description` | nullable string | Null by default; normalized raw text only when explicitly enabled. |

The export deliberately omits usernames, email addresses, account names, balances, raw database IDs, and model predictions. Custom category slugs and optionally exported descriptions still require privacy review before data leaves the controlled environment.

## Handoff rules

- Split train, validation, and test data by `user_key`, never randomly by row.
- Fit amount features separately by currency and transaction direction.
- Treat uncategorized rows as unlabeled, not as a category.
- Record the schema version, export checksum, date range, code revision, and evaluation metrics for every experiment.
- Evaluate per-category precision and recall, calibration, sparse-history behavior, and drift over time.
- Do not deploy a model solely from notebook metrics. Runtime integration requires threat modeling, monitoring, rollback, and human-review behavior.
- Exported datasets are sensitive financial data. Store them encrypted, restrict access, set a retention period, and delete them when the experiment ends.

See [`../../../ml/README.md`](../../../ml/README.md) for the optional experiment scaffold.
