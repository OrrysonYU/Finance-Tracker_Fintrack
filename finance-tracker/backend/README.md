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

Use one local virtual environment: `.venv`.

```powershell
cd backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
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

## Shared Health Check

Run the shared smoke script from the application root before committing a task:

```powershell
cd finance-tracker
.\scripts\dev-check.ps1
```

The script runs:

- backend Django system checks
- backend tests with `config.settings.test`
- frontend lint
- frontend production build

It uses `backend\.venv\Scripts\python.exe` when available. CI creates the same `.venv` path before running the script.

## Manual Backend Health Check

When a working Python environment is available, use these commands as the minimum manual check:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py check
python manage.py test --settings=config.settings.test
python manage.py runserver
```

`python manage.py check`, `python manage.py test --settings=config.settings.test`, and the API root at `http://127.0.0.1:8000/` remain useful backend-only validation targets.

## Notes for the Rebuild

- The only supported backend virtual environment is `.venv`.
- If another local virtual environment such as `venv` exists, treat it as stale local state and remove it after `.venv` passes the health check.
- The source of truth for backend packages is now `requirements.txt`.
- The source of truth for backend environment variables is now `.env.example`.
- Runtime defaults use `config.settings.local`, while tests should use `config.settings.test`.
- Use `..\scripts\dev-check.ps1` as the repeatable full-stack smoke check before task commits.
- The project-owned user model is `users.User`; fresh local databases should be created with `python manage.py migrate` before creating a superuser.
- Pre-AUTH-001 SQLite files should be backed up and recreated because Django custom user models need a clean migration baseline.
- SQLite databases are local runtime files and should not be committed.
