# Fintrack

Fintrack is an AI-powered personal finance tracker being rebuilt in a safe, modular, and reversible way.

This directory contains the application code. The rebuild plan is driven by a task-by-task workflow so the system stays understandable and runnable throughout development.

## Current Status

- Backend stack: Django + Django REST Framework + SQLite
- Frontend stack: React + Vite + Tailwind CSS
- Current product areas: auth, accounts, transactions, budgets, goals, reports
- Planned AI areas: categorization, insights, predictions, anomaly detection, recommendations

## Canonical Project Structure

This is the target structure we will move toward during the rebuild. Some folders do not exist yet and will be introduced gradually.

```text
finance-tracker/
  README.md
  docs/
    architecture.md
  backend/
    manage.py
    README.md
    config/
    apps/
      users/
      finance/
      budgets/
      reports/
      ai_insights/
    tests/
  frontend/
    README.md
    src/
      app/
      components/
      features/
        auth/
        dashboard/
        accounts/
        transactions/
        budgets/
        goals/
        ai-insights/
      lib/
      styles/
```

## Module Boundaries

- `backend/`: API, domain rules, persistence, reporting, AI services
- `frontend/`: user interface, routing, state, API clients, feature views
- `docs/`: architecture notes, conventions, and non-code project decisions

AI must remain its own module boundary. Finance CRUD and reporting should not contain embedded AI decision logic.

## Development Principles

- One task per session
- Small, reversible changes
- One responsibility per file
- Manual validation before moving forward
- Commit after each completed task
- Keep the system runnable after every feature checkpoint

## Setup Overview

### Backend

Current backend setup is provisional. A formal Python dependency manifest and environment template will be added in the next foundation task.

If you already have a working Python environment with the required packages installed, the current development entry point is:

```powershell
cd backend
python manage.py runserver
```

### Frontend

The current frontend commands are:

```powershell
cd frontend
npm install
npm run dev
```

Additional frontend commands:

```powershell
npm run build
npm run lint
```

Package manager standardization will be finalized in a later foundation task.

## Naming Conventions

- Use singular or plural folder names consistently based on domain intent, not ad hoc preference.
- Keep backend app names domain-based, for example `users`, `finance`, `budgets`, `reports`, `ai_insights`.
- Keep frontend folders feature-based, for example `features/transactions`, not large mixed-purpose page buckets.
- Prefer descriptive names such as `balance_service.py` over vague names such as `utils.py`.

## Immediate Rebuild Direction

1. Foundation and reproducibility
2. Auth and user domain
3. Finance core ledger
4. Goals and budgets
5. Reports and dashboard
6. AI module and simple intelligence features

For the detailed session-by-session backlog, see the repo-level plan at `../PROJECT_PLAN.md`.
