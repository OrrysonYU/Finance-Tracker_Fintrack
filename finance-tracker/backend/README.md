# Fintrack Backend

This backend currently runs a Django REST API for Fintrack. During the rebuild, it will be reshaped into a cleaner domain-oriented backend with explicit service boundaries and a dedicated AI module.

## Current Stack

- Django
- Django REST Framework
- SQLite for local development
- JWT authentication

## Current Entry Point

```powershell
cd backend
python manage.py runserver
```

The backend now has a committed dependency manifest and environment template:

- `requirements.txt`
- `.env.example`

The backend now uses split settings:

- `config.settings.base`
- `config.settings.local`
- `config.settings.test`

The default runtime entrypoint is `config.settings.local`.

## Fresh Setup Path

Create a clean virtual environment instead of depending on the checked-in local venv folders.

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py check
python manage.py test --settings=config.settings.test
python manage.py runserver
```

If your machine does not have the `py` launcher, use an installed Python executable instead:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

## Dependency Manifest

The backend currently depends on:

- Django
- Django REST Framework
- Simple JWT
- drf-spectacular
- django-cors-headers
- django-filter

SQLite is used for local development and does not require a separate package in `requirements.txt`.

## Current Functional Areas

- `users`: authentication and current-user endpoints
- `finance`: accounts, categories, transactions, saving goals
- `budgets`: budget definitions and utilization
- `reports`: financial summaries and dashboard-facing aggregates

There is also a stale `budget` app in the current codebase. It is not the canonical budget domain and should not be extended further.

## Canonical Target Structure

```text
backend/
  manage.py
  README.md
  config/
    settings/
      base.py
      local.py
      test.py
    urls.py
    wsgi.py
    asgi.py
  apps/
    users/
    finance/
    budgets/
    reports/
    ai_insights/
  tests/
```

## Backend Architecture Rules

- Views stay thin.
- Serializers validate and shape API contracts.
- Domain logic lives in services.
- Query/report logic stays separate from write logic where practical.
- App boundaries reflect business domains, not framework convenience.
- AI logic must live under `ai_insights`, not inside `finance` or `reports`.

## Responsibility Boundaries

### `users`
- user identity
- auth flows
- profile and preference data

### `finance`
- accounts
- categories
- transactions
- saving goals
- balance rules

### `budgets`
- budget definitions
- budget items
- budget utilization calculations

### `reports`
- read-only summaries
- dashboard aggregates
- category spending views

### `ai_insights`
- smart categorization
- insight generation
- forecasts
- anomaly detection
- recommendation services

## Naming Conventions

- Prefer one concern per file.
- Use service names that describe business behavior, for example `budget_forecast.py`.
- Avoid generic catch-all files such as `helpers.py` or `misc.py`.
- Group tests by feature, not by huge shared buckets.

## Manual Health Check

When a working Python environment is available, use these commands as the minimum manual check:

```powershell
cd backend
Copy-Item .env.example .env
pip install -r requirements.txt
python manage.py check
python manage.py test --settings=config.settings.test
python manage.py runserver
```

`python manage.py check` is the main validation target for this task.

## Notes for the Rebuild

- The checked-in `venv` folder should be treated as disposable local state, not as the source of truth for backend setup.
- The source of truth for backend packages is now `requirements.txt`.
- The source of truth for backend environment variables is now `.env.example`.
- Runtime defaults use `config.settings.local`, while tests should use `config.settings.test`.
- More formal health and test commands will be added in later foundation tasks.
