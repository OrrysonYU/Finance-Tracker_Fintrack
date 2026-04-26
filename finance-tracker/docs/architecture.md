# Fintrack Architecture Notes

## Purpose

This document defines the canonical architecture for the Fintrack rebuild so future work follows a stable structure instead of growing organically.

## System Goal

Fintrack is a personal finance application with an explicit AI layer. The core product must work as a dependable finance tracker first, while the AI layer adds insights, suggestions, and predictions without weakening the core ledger.

## Architectural Priorities

1. Reproducibility
2. Clear module boundaries
3. Small, safe iterations
4. Testability
5. AI decoupling

## High-Level Shape

```text
User Interface (React)
        |
        v
API Layer (Django REST Framework)
        |
        v
Domain Services
        |
        +--> Core Finance Domain
        |
        +--> Reporting Domain
        |
        +--> AI Insights Domain
        |
        v
Persistence Layer (SQLite now, swappable later)
```

## Backend Module Design

### `users`
- owns identity and authentication
- should expose a stable current-user contract
- may later hold currency, locale, and personalization preferences

### `finance`
- owns accounts, categories, transactions, and saving goals
- is the source of truth for ledger data
- should contain balance rules in dedicated services, not hidden framework side effects where possible

### `budgets`
- owns budget definitions and budget line items
- computes utilization against finance transactions
- should not duplicate transaction storage

### `reports`
- owns read-oriented aggregation and summaries
- provides dashboard-friendly views over finance data
- should avoid owning write-heavy business logic

### `ai_insights`
- owns all intelligence features
- consumes finance and reporting data through clear service interfaces
- starts rule-based, then moves into predictive and model-assisted behavior

## Frontend Module Design

The frontend should move to a feature-oriented structure.

```text
frontend/src/
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

### Frontend Rules

- Routing belongs in `app/`.
- Shared primitives belong in `components/`.
- API clients should stay close to the feature that uses them, unless truly cross-cutting.
- Avoid putting all screens into one generic `pages/` bucket long-term.

## AI Architecture Rules

AI is a separate module, not a shortcut inside existing business code.

### Phase 1
- keyword-based categorization
- spending observations
- budget warnings

### Phase 2
- burn-rate prediction
- recurring expense detection
- anomaly detection

### Phase 3
- model-assisted classification
- recommendation ranking
- natural-language summaries

### AI Constraints

- AI features must fail gracefully.
- The finance ledger must still work when AI is disabled.
- AI outputs must be explainable enough for users to trust them.
- AI endpoints should never be the only source of critical financial truth.

## Folder and File Conventions

### General

- Keep files small and focused.
- Prefer descriptive names over generic utility names.
- Avoid duplicate domain names with slightly different spellings or plurality.
- Document new top-level folders when they are introduced.

### Backend

- `models.py`: persistence entities only
- `serializers/`: request and response contracts
- `views/`: endpoint orchestration
- `services/`: business logic
- `tests/`: behavior verification

### Frontend

- feature folders own their UI, API, and local state
- shared HTTP or app bootstrap code goes in `lib/` or `app/`
- styling tokens should be centralized, not duplicated across feature files

## Rebuild Safety Rules

- one task per session
- manual validation before moving on
- commit after each verified task
- keep the app runnable after each checkpoint
- do not make large cross-module changes without an explicit task

## Non-Canonical Areas in the Current Codebase

- `backend/budget/` appears stale and should not be treated as the long-term budget domain
- frontend still uses a generic `pages/` structure that will be migrated toward `features/`
- dependency setup is not yet fully source-controlled on the backend

These are known rebuild targets, not places to keep investing in indefinitely.
