# Fintrack Rebuild Master Plan

## 1. Current Project Understanding

### What exists today
- Repository root: `fintrack`
- Main app root: `finance-tracker/`
- Backend: Django + Django REST Framework + SQLite
- Frontend: React + Vite + Tailwind CSS + React Query + Axios
- Auth approach: JWT via `rest_framework_simplejwt`
- Existing backend app modules:
  - `users`
  - `finance`
  - `budgets`
  - `reports`
- Existing frontend pages:
  - Login
  - Register
  - Dashboard
  - Accounts
  - Transactions
  - Budgets
  - Goals

### Intended system behavior
Fintrack is intended to be a personal finance platform where a user can:
- register and sign in
- manage financial accounts
- record income and expenses
- organize transactions by category
- define budgets
- track saving goals
- view dashboard summaries and charts
- later receive AI-powered financial insights, predictions, and recommendations

### Important findings from the current codebase
- The project is already split into backend and frontend, which is a good starting shape.
- The backend includes domain models for accounts, categories, transactions, saving goals, budgets, and reports.
- The frontend already attempts to consume live API endpoints for the core finance flows.
- There is no real AI module yet. The current app is finance CRUD/reporting with no decoupled intelligence layer.
- There is an extra `backend/budget` app that looks unused and stale, while `backend/budgets` is the real budget module.
- A local SQLite database file is committed in the backend.
- A local Python virtual environment is inside the repo and appears non-portable.
- I did not find a committed backend dependency manifest such as `requirements.txt` or `pyproject.toml`.
- The frontend contains `node_modules` locally and both `package-lock.json` and `pnpm-lock.yaml`, which suggests package-manager drift.
- Tests appear minimal or absent from the app architecture.
- Git repository exists, but no Git remote is configured right now, so the required push step cannot happen until `origin` is added.

### Architectural risks to avoid in the rebuild
- hidden environment dependencies
- business logic spread across views/components
- brittle balance updates tied only to model signals
- duplicated app/module names
- tight coupling between UI and raw API shapes
- no testable service boundaries
- AI logic mixed directly into CRUD endpoints

## 2. Rebuild Goals

### Primary goals
- rebuild in safe, reversible increments
- keep the app runnable after every completed feature
- separate domain logic, API logic, UI logic, and AI logic
- create a reproducible developer setup
- introduce AI as an explicit module, not as scattered helper code

### Non-goals for early phases
- advanced ML training in the first milestones
- production cloud deployment before the core product is stable
- large refactors across many modules in one session

## 3. Target Architecture

### Target backend shape
```text
finance-tracker/
  backend/
    manage.py
    requirements.txt
    .env.example
    config/
      __init__.py
      settings/
        __init__.py
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

### Target frontend shape
```text
finance-tracker/
  frontend/
    package.json
    .env.example
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

### Design rules
- one responsibility per file
- domain logic in services, not in views or components
- thin API layer
- frontend organized by feature
- AI isolated behind service interfaces and feature flags
- every step manually testable before moving on

## 4. Development Order

1. Foundation and reproducibility
2. Authentication and user domain
3. Core finance ledger
4. Saving goals
5. Budgeting
6. Reporting and dashboard aggregation
7. AI service boundary
8. Rule-based AI features
9. Predictive AI features
10. Product UI/UX modernization
11. Hardening, test coverage, release readiness

## 5. Core Modules and Features

### Module A. Foundation
Features:
- repo structure and documentation
- dependency manifests
- environment configuration
- lint/build/test commands
- CI-safe project health checks

### Module B. Auth and Users
Features:
- user model and profile
- registration and login
- JWT lifecycle
- current-user endpoint
- protected frontend routes

### Module C. Finance Core
Features:
- accounts
- categories
- transactions
- account balance engine
- transaction filtering and validation

### Module D. Saving Goals
Features:
- goal creation
- goal progress tracking
- goals UI

### Module E. Budgets
Features:
- budget definitions
- budget items per category
- budget utilization calculations
- budget UI

### Module F. Reports and Dashboard
Features:
- monthly summary
- category spending breakdown
- dashboard aggregation
- charts and KPI cards

### Module G. AI Insights
Features:
- AI service module and interfaces
- smart transaction categorization
- spending insights
- budget burn prediction
- anomaly detection
- personalized recommendations

### Module H. Quality and Operations
Features:
- product UI/UX modernization
- design system/theme consistency
- responsive visual QA
- API tests
- frontend smoke checks
- CI automation
- release checklist

## 6. AI Roadmap

### Phase 1: Rule-based intelligence
- category suggestion from merchant keywords and amount patterns
- monthly spending observations
- budget warning messages
- simple savings nudges

### Phase 2: Heuristic prediction
- end-of-month budget exhaustion estimate
- recurring-expense detection
- unusual transaction flagging using moving averages and thresholds

### Phase 3: Advanced AI
- model-assisted categorization
- trend forecasting
- recommendation ranking
- optional LLM-generated natural language financial summaries

## 7. Atomic Task Backlog

Note: every task below is intended to fit within one focused 30-90 minute session.

---

## Module A. Foundation

### Feature A1. Repo Contract

#### Task FDN-001 - Create canonical rebuild skeleton and architecture notes
- Description: Create the clean target folder contract and top-level architecture documentation so future work follows one structure instead of growing organically.
- Files to create/update:
  - `finance-tracker/README.md`
  - `finance-tracker/backend/README.md`
  - `finance-tracker/frontend/README.md`
  - `finance-tracker/docs/architecture.md`
- Expected output/result: A documented canonical structure, setup overview, module boundaries, and naming conventions.
- Manual test instructions:
  1. Open each README and confirm backend/frontend run commands are documented.
  2. Confirm `docs/architecture.md` lists modules and ownership boundaries.
  3. Confirm no code behavior changed.
- Dependencies: None

#### Task FDN-002 - Add backend dependency manifest and environment template
- Description: Make the backend reproducible by declaring Python dependencies and required environment variables in source control.
- Files to create/update:
  - `finance-tracker/backend/requirements.txt`
  - `finance-tracker/backend/.env.example`
  - `finance-tracker/backend/README.md`
- Expected output/result: A clean backend install path without relying on a checked-in virtual environment.
- Manual test instructions:
  1. Create a fresh virtual environment outside the repo.
  2. Run `pip install -r requirements.txt`.
  3. Copy `.env.example` to `.env` and fill development values.
  4. Run `python manage.py check`.
- Dependencies: FDN-001

#### Task FDN-003 - Normalize frontend package management and environment template
- Description: Pick one package manager, document it, and add a frontend environment template to avoid setup drift.
- Files to create/update:
  - `finance-tracker/frontend/package.json`
  - `finance-tracker/frontend/.env.example`
  - `finance-tracker/frontend/README.md`
  - remove one of:
    - `finance-tracker/frontend/package-lock.json`
    - `finance-tracker/frontend/pnpm-lock.yaml`
- Expected output/result: One official frontend install path and one documented environment contract.
- Manual test instructions:
  1. Delete local `node_modules`.
  2. Reinstall with the chosen package manager.
  3. Run the app with the documented command.
  4. Confirm the login page loads.
- Dependencies: FDN-001

### Feature A2. Config and Project Health

#### Task FDN-004 - Split backend settings into base/local/test
- Description: Replace the single Django settings file with environment-specific settings to support safe testing and later deployment.
- Files to create/update:
  - `finance-tracker/backend/config/settings/base.py`
  - `finance-tracker/backend/config/settings/local.py`
  - `finance-tracker/backend/config/settings/test.py`
  - `finance-tracker/backend/manage.py`
  - `finance-tracker/backend/config/wsgi.py`
  - `finance-tracker/backend/config/asgi.py`
- Expected output/result: The backend starts with local settings and can run isolated test settings.
- Manual test instructions:
  1. Run `python manage.py check` with local settings.
  2. Run `python manage.py test` with test settings.
  3. Confirm both commands succeed.
- Dependencies: FDN-002

#### Task FDN-005 - Add shared health commands and CI smoke script
- Description: Add consistent lint/build/check commands so every future task can be validated the same way.
- Files to create/update:
  - `finance-tracker/backend/README.md`
  - `finance-tracker/frontend/package.json`
  - `finance-tracker/scripts/dev-check.ps1`
  - `.github/workflows/ci.yml`
- Expected output/result: One repeatable smoke-check command and a basic CI workflow.
- Manual test instructions:
  1. Run the smoke script locally.
  2. Confirm it executes backend checks and frontend build/lint.
  3. Review workflow file for matching commands.
- Dependencies: FDN-003, FDN-004

---

## Module B. Auth and Users

### Feature B1. Identity Domain

#### Task AUTH-001 - Introduce a custom user model before deeper rebuild work
- Description: Create a project-owned user model so future profile, preferences, and AI personalization fields do not depend on Django's default user table.
- Files to create/update:
  - `finance-tracker/backend/apps/users/models.py`
  - `finance-tracker/backend/config/settings/base.py`
  - `finance-tracker/backend/apps/users/admin.py`
  - `finance-tracker/backend/apps/users/migrations/*`
- Expected output/result: Project uses a custom user model with a stable migration baseline.
- Manual test instructions:
  1. Run migrations on a fresh database.
  2. Create a superuser.
  3. Open Django admin and confirm the custom user model appears.
- Dependencies: FDN-004

#### Task AUTH-002 - Add user profile and preference fields
- Description: Add a small profile model or user fields needed for currency preference, locale, and future AI personalization.
- Files to create/update:
  - `finance-tracker/backend/apps/users/models.py`
  - `finance-tracker/backend/apps/users/admin.py`
  - `finance-tracker/backend/apps/users/migrations/*`
- Expected output/result: Each user has stored profile-level settings for future finance defaults.
- Manual test instructions:
  1. Create a user in admin.
  2. Update profile fields.
  3. Confirm values save correctly.
- Dependencies: AUTH-001

### Feature B2. Auth API

#### Task AUTH-003 - Rebuild registration, login, refresh, and me endpoints
- Description: Recreate the auth API with clean serializers, permissions, and response contracts.
- Files to create/update:
  - `finance-tracker/backend/apps/users/serializers.py`
  - `finance-tracker/backend/apps/users/views.py`
  - `finance-tracker/backend/apps/users/urls.py`
  - `finance-tracker/backend/config/urls.py`
- Expected output/result: Stable auth endpoints for register, token, refresh, and current user.
- Manual test instructions:
  1. Register a new user through the API.
  2. Log in and capture access/refresh tokens.
  3. Call the `me` endpoint with the access token.
  4. Refresh the token and retry `me`.
- Dependencies: AUTH-002

#### Task AUTH-004 - Add auth API tests
- Description: Cover the happy path and key failures for registration, login, and authenticated user retrieval.
- Files to create/update:
  - `finance-tracker/backend/apps/users/tests/test_auth_api.py`
- Expected output/result: Automated tests for the core auth contract.
- Manual test instructions:
  1. Run `python manage.py test apps.users.tests.test_auth_api`.
  2. Confirm all tests pass.
- Dependencies: AUTH-003

### Feature B3. Auth Frontend

#### Task AUTH-005 - Rebuild frontend auth client and token storage flow
- Description: Create a clean auth client layer for login, registration, logout, and token refresh behavior.
- Files to create/update:
  - `finance-tracker/frontend/src/features/auth/api.js`
  - `finance-tracker/frontend/src/features/auth/auth-storage.js`
  - `finance-tracker/frontend/src/lib/http.js`
- Expected output/result: Frontend auth requests use one centralized HTTP and token flow.
- Manual test instructions:
  1. Register a user from the UI.
  2. Refresh the page.
  3. Confirm the session remains active.
- Dependencies: AUTH-003

#### Task AUTH-006 - Rebuild login/register routes and protected app shell
- Description: Create the production-ready auth pages and protected routing with clear loading and error states.
- Files to create/update:
  - `finance-tracker/frontend/src/features/auth/LoginPage.jsx`
  - `finance-tracker/frontend/src/features/auth/RegisterPage.jsx`
  - `finance-tracker/frontend/src/app/AppRoutes.jsx`
  - `finance-tracker/frontend/src/app/AuthProvider.jsx`
- Expected output/result: Users can register, sign in, sign out, and be redirected correctly.
- Manual test instructions:
  1. Visit `/register` and create an account.
  2. Confirm redirect into the app.
  3. Log out and confirm redirect to `/login`.
- Dependencies: AUTH-005

---

## Module C. Finance Core

### Feature C1. Master Data

#### Task FIN-001 - Rebuild category model and seed defaults
- Description: Recreate categories with support for shared defaults and user-defined categories.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/models.py`
  - `finance-tracker/backend/apps/finance/admin.py`
  - `finance-tracker/backend/apps/finance/management/commands/seed_categories.py`
  - `finance-tracker/backend/apps/finance/migrations/*`
- Expected output/result: Default categories can be seeded and users can later add personal categories.
- Manual test instructions:
  1. Run the seed command.
  2. Open admin and confirm category rows exist.
  3. Confirm duplicate seeding is handled safely.
- Dependencies: AUTH-001

#### Task FIN-002 - Rebuild account model and account API
- Description: Create a focused account model and CRUD API without mixing balance mutation concerns into the serializer.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/models.py`
  - `finance-tracker/backend/apps/finance/serializers/account.py`
  - `finance-tracker/backend/apps/finance/views/account.py`
  - `finance-tracker/backend/apps/finance/urls.py`
- Expected output/result: Authenticated users can manage only their own accounts.
- Manual test instructions:
  1. Create an account via API.
  2. List accounts for the same user.
  3. Confirm another user cannot access the account.
- Dependencies: FIN-001

### Feature C2. Ledger

#### Task FIN-003 - Rebuild transaction model and balance service
- Description: Implement transactions and a dedicated balance-update service so ledger behavior is testable and not hidden in fragile side effects.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/models.py`
  - `finance-tracker/backend/apps/finance/services/balance_service.py`
  - `finance-tracker/backend/apps/finance/migrations/*`
- Expected output/result: Account balances can be derived and updated through one explicit domain service.
- Manual test instructions:
  1. Create an account with a known opening balance.
  2. Add one income and one expense transaction.
  3. Confirm the resulting balance matches the expected math.
- Dependencies: FIN-002

#### Task FIN-004 - Rebuild transaction API with filtering and validation
- Description: Add clean transaction CRUD endpoints with account ownership checks, category validation, search, and ordering.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/serializers/transaction.py`
  - `finance-tracker/backend/apps/finance/views/transaction.py`
  - `finance-tracker/backend/apps/finance/urls.py`
- Expected output/result: Transactions can be created, listed, filtered, and deleted safely.
- Manual test instructions:
  1. Create several transactions across categories.
  2. Filter by account and category.
  3. Confirm only the signed-in user's transactions appear.
- Dependencies: FIN-003

#### Task FIN-005 - Add finance API tests for accounts and transactions
- Description: Cover account ownership, transaction creation, and balance updates with automated tests.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/tests/test_accounts_api.py`
  - `finance-tracker/backend/apps/finance/tests/test_transactions_api.py`
- Expected output/result: Core ledger behavior is protected by tests.
- Manual test instructions:
  1. Run the finance test module.
  2. Confirm all tests pass.
- Dependencies: FIN-004

### Feature C3. Finance Frontend

#### Task FIN-006 - Rebuild accounts page against the new API contract
- Description: Create a clean accounts UI with list, create, delete, loading, error, and empty states.
- Files to create/update:
  - `finance-tracker/frontend/src/features/accounts/AccountsPage.jsx`
  - `finance-tracker/frontend/src/features/accounts/api.js`
  - `finance-tracker/frontend/src/features/accounts/components/*`
- Expected output/result: Users can manage accounts from the UI using the rebuilt backend.
- Manual test instructions:
  1. Add two accounts in the UI.
  2. Refresh the page and confirm both persist.
  3. Delete one account and confirm the list updates.
- Dependencies: AUTH-006, FIN-002

#### Task FIN-007 - Rebuild transactions page against the new API contract
- Description: Create the transaction flow with account selection, category selection, and list refresh behavior.
- Files to create/update:
  - `finance-tracker/frontend/src/features/transactions/TransactionsPage.jsx`
  - `finance-tracker/frontend/src/features/transactions/api.js`
  - `finance-tracker/frontend/src/features/transactions/components/*`
- Expected output/result: Users can create and view transactions with correct account and category linkage.
- Manual test instructions:
  1. Add an expense and an income from the UI.
  2. Confirm account balances update correctly.
  3. Confirm the dashboard data changes after reload if reports exist.
- Dependencies: FIN-004, FIN-006

---

## Module D. Saving Goals

### Feature D1. Goals Backend

#### Task GOAL-001 - Rebuild saving goal model and API
- Description: Recreate saving goals with validation, ownership rules, and a clean serializer contract.
- Files to create/update:
  - `finance-tracker/backend/apps/finance/models.py`
  - `finance-tracker/backend/apps/finance/serializers/goal.py`
  - `finance-tracker/backend/apps/finance/views/goal.py`
  - `finance-tracker/backend/apps/finance/urls.py`
- Expected output/result: Users can manage saving goals independently of transaction CRUD.
- Manual test instructions:
  1. Create a saving goal through the API.
  2. List goals for the signed-in user.
  3. Confirm goal records are user-scoped.
- Dependencies: AUTH-001

### Feature D2. Goals Frontend

#### Task GOAL-002 - Rebuild saving goals UI
- Description: Build the goals page with create/list/delete flows and visible progress states.
- Files to create/update:
  - `finance-tracker/frontend/src/features/goals/GoalsPage.jsx`
  - `finance-tracker/frontend/src/features/goals/api.js`
  - `finance-tracker/frontend/src/features/goals/components/*`
- Expected output/result: Users can manage goals from the frontend.
- Manual test instructions:
  1. Add a goal from the UI.
  2. Confirm the goal appears after refresh.
  3. Delete the goal and confirm it disappears.
- Dependencies: GOAL-001, AUTH-006

---

## Module E. Budgets

### Feature E1. Budget Definitions

#### Task BUD-001 - Rebuild budget and budget-item models
- Description: Create budget definitions with monthly/yearly/custom periods and category-based budget lines.
- Files to create/update:
  - `finance-tracker/backend/apps/budgets/models.py`
  - `finance-tracker/backend/apps/budgets/admin.py`
  - `finance-tracker/backend/apps/budgets/migrations/*`
- Expected output/result: Budgets are represented as their own domain, separate from reports.
- Manual test instructions:
  1. Create a budget in admin or shell.
  2. Add multiple budget items.
  3. Confirm relationships save correctly.
- Dependencies: FIN-001

#### Task BUD-002 - Build budget utilization service and API endpoint
- Description: Move utilization math into a service that calculates spent, remaining, and totals for a budget period.
- Files to create/update:
  - `finance-tracker/backend/apps/budgets/services/utilization_service.py`
  - `finance-tracker/backend/apps/budgets/serializers.py`
  - `finance-tracker/backend/apps/budgets/views.py`
  - `finance-tracker/backend/apps/budgets/urls.py`
- Expected output/result: Each budget has a reliable utilization endpoint.
- Manual test instructions:
  1. Create transactions in categories linked to a budget.
  2. Call the utilization endpoint.
  3. Confirm spent and remaining amounts match expectations.
- Dependencies: BUD-001, FIN-004

### Feature E2. Budget Frontend

#### Task BUD-003 - Rebuild budgets page with create and utilization views
- Description: Create a usable budget interface instead of the current read-only placeholder.
- Files to create/update:
  - `finance-tracker/frontend/src/features/budgets/BudgetsPage.jsx`
  - `finance-tracker/frontend/src/features/budgets/api.js`
  - `finance-tracker/frontend/src/features/budgets/components/*`
- Expected output/result: Users can create budgets and inspect utilization in the UI.
- Manual test instructions:
  1. Create a budget from the UI.
  2. Open its utilization section.
  3. Confirm category limits and spending render correctly.
- Dependencies: BUD-002, AUTH-006

---

## Module F. Reports and Dashboard

### Feature F1. Reporting Services

#### Task REP-001 - Rebuild monthly summary and category-spend services
- Description: Create report query services that calculate current-period income, expense, net, and category totals.
- Files to create/update:
  - `finance-tracker/backend/apps/reports/services/monthly_summary.py`
  - `finance-tracker/backend/apps/reports/services/category_spend.py`
  - `finance-tracker/backend/apps/reports/views.py`
  - `finance-tracker/backend/apps/reports/urls.py`
- Expected output/result: Reporting math is centralized and reusable.
- Manual test instructions:
  1. Seed transactions across income and expense categories.
  2. Call both report endpoints.
  3. Confirm totals match manual calculations.
- Dependencies: FIN-004

#### Task REP-002 - Add dashboard aggregation endpoint
- Description: Add one frontend-friendly dashboard endpoint that combines summary, balances, goals, and budget signals.
- Files to create/update:
  - `finance-tracker/backend/apps/reports/services/dashboard_overview.py`
  - `finance-tracker/backend/apps/reports/views.py`
  - `finance-tracker/backend/apps/reports/urls.py`
- Expected output/result: Frontend can load the dashboard from one stable API contract.
- Manual test instructions:
  1. Call the dashboard endpoint.
  2. Confirm the response includes summary, accounts, goals, and budget highlights.
  3. Confirm no extra frontend joins are required for the basic dashboard.
- Dependencies: GOAL-001, BUD-002, REP-001

### Feature F2. Dashboard Frontend

#### Task REP-003 - Rebuild dashboard UI against the aggregation endpoint
- Description: Simplify the dashboard page so it consumes one API contract and renders KPI cards plus charts cleanly.
- Files to create/update:
  - `finance-tracker/frontend/src/features/dashboard/DashboardPage.jsx`
  - `finance-tracker/frontend/src/features/dashboard/api.js`
  - `finance-tracker/frontend/src/features/dashboard/components/*`
- Expected output/result: Dashboard loads from one request with clear loading and empty states.
- Manual test instructions:
  1. Open the dashboard after creating sample data.
  2. Confirm cards, chart data, and totals are correct.
  3. Refresh after adding a new transaction and confirm the dashboard updates.
- Dependencies: REP-002, FIN-007, GOAL-002, BUD-003

---

## Module G. AI Insights

### Feature G1. AI Module Boundary

#### Task AI-001 - Create the AI insights module contract and feature flags
- Description: Add a dedicated AI module with service interfaces, settings flags, and placeholder endpoints so AI work stays decoupled from the core ledger.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/apps.py`
  - `finance-tracker/backend/apps/ai_insights/services/__init__.py`
  - `finance-tracker/backend/apps/ai_insights/views.py`
  - `finance-tracker/backend/apps/ai_insights/urls.py`
  - `finance-tracker/backend/config/settings/base.py`
- Expected output/result: AI logic has its own namespace and can be enabled or disabled safely.
- Manual test instructions:
  1. Start the backend with AI features enabled.
  2. Call a placeholder AI health endpoint.
  3. Disable the feature flag and confirm core finance flows still work.
- Dependencies: FDN-004

### Feature G2. Rule-based AI

#### Task AI-002 - Build rule-based transaction categorization suggestions
- Description: Suggest a category from keywords, merchant names, and user history without invoking external ML.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/services/category_suggester.py`
  - `finance-tracker/backend/apps/ai_insights/views.py`
  - `finance-tracker/backend/apps/ai_insights/tests/test_category_suggester.py`
- Expected output/result: The system returns category suggestions for uncategorized transactions.
- Manual test instructions:
  1. Submit sample transaction descriptions such as salary, rent, fuel, and supermarket.
  2. Confirm the returned category suggestions are sensible.
  3. Confirm unknown descriptions fail gracefully.
- Dependencies: AI-001, FIN-001, FIN-004

#### Task AI-003 - Build rule-based spending insight generation
- Description: Generate plain-language observations such as top spending category, month-over-month increases, and savings nudges.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/services/spending_insights.py`
  - `finance-tracker/backend/apps/ai_insights/views.py`
  - `finance-tracker/backend/apps/ai_insights/tests/test_spending_insights.py`
- Expected output/result: The backend can return a small list of actionable financial insights.
- Manual test instructions:
  1. Seed a month of representative transactions.
  2. Call the insights endpoint.
  3. Confirm the text output reflects the data accurately.
- Dependencies: AI-001, REP-001

### Feature G3. Predictive AI

#### Task AI-004 - Build heuristic budget burn prediction
- Description: Estimate whether a user is likely to exceed a budget before the period ends using run-rate heuristics.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/services/budget_forecast.py`
  - `finance-tracker/backend/apps/ai_insights/views.py`
  - `finance-tracker/backend/apps/ai_insights/tests/test_budget_forecast.py`
- Expected output/result: Budget forecasts return projected spend and risk status.
- Manual test instructions:
  1. Create a monthly budget and partial-month spending.
  2. Call the forecast endpoint.
  3. Confirm the projection is mathematically reasonable.
- Dependencies: AI-001, BUD-002

#### Task AI-005 - Build anomaly detection for unusual transactions
- Description: Flag transactions that deviate strongly from a user's normal category or amount patterns using simple statistics.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/services/anomaly_detector.py`
  - `finance-tracker/backend/apps/ai_insights/views.py`
  - `finance-tracker/backend/apps/ai_insights/tests/test_anomaly_detector.py`
- Expected output/result: Suspicious or unusual transactions are surfaced for review.
- Manual test instructions:
  1. Seed normal weekly spending.
  2. Add one extreme outlier transaction.
  3. Confirm the outlier is flagged.
- Dependencies: AI-001, FIN-004

### Feature G4. AI Frontend

#### Task AI-006 - Add AI insights cards to the dashboard
- Description: Surface categorization suggestions, insight summaries, and warnings in a dedicated AI area of the UI.
- Files to create/update:
  - `finance-tracker/frontend/src/features/ai-insights/AiInsightsPanel.jsx`
  - `finance-tracker/frontend/src/features/ai-insights/api.js`
  - `finance-tracker/frontend/src/features/dashboard/DashboardPage.jsx`
- Expected output/result: AI output is visible but isolated from core ledger UI.
- Manual test instructions:
  1. Open the dashboard with seeded AI data.
  2. Confirm insights render in a separate panel.
  3. Confirm the rest of the dashboard still works if AI data is unavailable.
- Dependencies: AI-003, AI-004, AI-005, REP-003

#### Task AI-007 - Prepare optional ML handoff artifacts
- Description: Export a clean training-data contract and notebook or script scaffold for future ML experiments without binding the app to ML infrastructure yet.
- Files to create/update:
  - `finance-tracker/backend/apps/ai_insights/services/training_export.py`
  - `finance-tracker/backend/apps/ai_insights/README.md`
  - `finance-tracker/ml/README.md`
- Expected output/result: Future ML work has a safe, explicit starting point.
- Manual test instructions:
  1. Run the export command on sample data.
  2. Confirm the export file is generated with the documented schema.
  3. Confirm the app itself does not depend on the export.
- Dependencies: AI-002, AI-003, AI-005

---

## Module H. Quality and Operations

### Feature H0. Product UI/UX Modernization

#### Task UIX-001 - Define product UI direction options before implementation
- Description: Prepare several distinct visual direction options for the real-world finance product experience before any modernization work begins.
- Files to create/update:
  - `finance-tracker/docs/ui-directions.md`
- Expected output/result: The user can compare multiple UI directions, choose one, and understand tradeoffs before implementation starts.
- Manual test instructions:
  1. Open `docs/ui-directions.md`.
  2. Confirm it includes several clearly different product directions with examples of layout, color, typography, interaction style, and dashboard feel.
  3. Confirm no application code changed.
- Dependencies: AI-006

#### Task UIX-002 - Choose design system/theme and establish UI tokens
- Description: Convert the selected visual direction into a practical design system with colors, typography, spacing, radii, shadows, surfaces, states, and chart styling rules.
- Files to create/update:
  - `finance-tracker/frontend/src/styles/theme.css`
  - `finance-tracker/frontend/src/styles/tokens.css`
  - `finance-tracker/frontend/src/components/ui/*`
  - `finance-tracker/docs/ui-directions.md`
- Expected output/result: The frontend has a reusable theme foundation for consistent production-grade screens.
- Manual test instructions:
  1. Start the frontend.
  2. Confirm existing pages still render.
  3. Inspect the theme documentation and confirm it matches the selected direction.
- Dependencies: UIX-001

#### Task UIX-003 - Modernize app shell and responsive navigation
- Description: Upgrade the protected app shell, navigation, page frame, spacing system, and mobile behavior to feel like a polished finance product.
- Files to create/update:
  - `finance-tracker/frontend/src/app/AppRoutes.jsx`
  - `finance-tracker/frontend/src/app/AuthProvider.jsx`
  - `finance-tracker/frontend/src/components/layout/*`
  - `finance-tracker/frontend/src/styles/theme.css`
- Expected output/result: Authenticated users get a professional responsive layout with clear navigation, account context, and consistent page structure.
- Manual test instructions:
  1. Log in on desktop width and confirm navigation, page spacing, and active states work.
  2. Resize to mobile width and confirm navigation remains usable.
  3. Refresh a protected route and confirm the session and layout remain stable.
- Dependencies: UIX-002, AUTH-006

#### Task UIX-004 - Polish auth pages, forms, and empty/loading/error states
- Description: Apply the selected production UI direction to login, registration, reusable form controls, validation messages, loading states, and empty/error states.
- Files to create/update:
  - `finance-tracker/frontend/src/features/auth/LoginPage.jsx`
  - `finance-tracker/frontend/src/features/auth/RegisterPage.jsx`
  - `finance-tracker/frontend/src/components/ui/*`
  - `finance-tracker/frontend/src/styles/theme.css`
- Expected output/result: Auth screens feel polished, trustworthy, responsive, and consistent with the rest of the product.
- Manual test instructions:
  1. Visit `/login` and `/register`.
  2. Confirm valid, invalid, loading, and error states are clear.
  3. Confirm both pages work on desktop and mobile widths.
- Dependencies: UIX-002, AUTH-006

#### Task UIX-005 - Polish dashboard cards, financial summaries, and charts
- Description: Upgrade the dashboard into a production-grade finance overview with strong KPI cards, chart hierarchy, spending summaries, AI insight placement, and responsive behavior.
- Files to create/update:
  - `finance-tracker/frontend/src/features/dashboard/DashboardPage.jsx`
  - `finance-tracker/frontend/src/features/dashboard/components/*`
  - `finance-tracker/frontend/src/features/ai-insights/AiInsightsPanel.jsx`
  - `finance-tracker/frontend/src/components/ui/*`
- Expected output/result: The dashboard presents balances, trends, budgets, goals, and AI insights in a polished real-world product layout.
- Manual test instructions:
  1. Open the dashboard with sample finance data.
  2. Confirm KPI cards, charts, summaries, and AI insights are visually clear and correct.
  3. Resize to tablet and mobile widths and confirm the layout remains usable.
- Dependencies: UIX-002, REP-003, AI-006

#### Task UIX-006 - Polish transaction and account data views
- Description: Modernize finance-heavy screens with readable tables, cards, filters, form layouts, row actions, empty states, and loading states.
- Files to create/update:
  - `finance-tracker/frontend/src/features/accounts/AccountsPage.jsx`
  - `finance-tracker/frontend/src/features/accounts/components/*`
  - `finance-tracker/frontend/src/features/transactions/TransactionsPage.jsx`
  - `finance-tracker/frontend/src/features/transactions/components/*`
  - `finance-tracker/frontend/src/components/ui/*`
- Expected output/result: Accounts and transactions feel like usable production finance tools rather than basic CRUD pages.
- Manual test instructions:
  1. Add, view, filter, and delete account/transaction data.
  2. Confirm tables and cards are readable with short and long data.
  3. Confirm empty, loading, and error states are polished.
- Dependencies: UIX-002, FIN-006, FIN-007

#### Task UIX-007 - Polish budgets, goals, reports, and AI insight surfaces
- Description: Apply the selected UI direction to remaining finance modules so budgets, goals, reports, and AI insights share one cohesive product language.
- Files to create/update:
  - `finance-tracker/frontend/src/features/budgets/BudgetsPage.jsx`
  - `finance-tracker/frontend/src/features/budgets/components/*`
  - `finance-tracker/frontend/src/features/goals/GoalsPage.jsx`
  - `finance-tracker/frontend/src/features/goals/components/*`
  - `finance-tracker/frontend/src/features/reports/*`
  - `finance-tracker/frontend/src/features/ai-insights/*`
- Expected output/result: Secondary product areas feel consistent with the dashboard and core ledger screens.
- Manual test instructions:
  1. Create budgets and goals and inspect their visual states.
  2. Open reports and AI insight areas with sample data.
  3. Confirm cards, charts, tables, and forms use consistent spacing and styling.
- Dependencies: UIX-002, GOAL-002, BUD-003, REP-003, AI-006

#### Task UIX-008 - Run responsive, accessibility, and visual QA pass
- Description: Perform a final product UI pass for responsive layout, keyboard usability, focus states, contrast, empty states, chart readability, and runtime visual issues.
- Files to create/update:
  - `finance-tracker/frontend/QA_CHECKLIST.md`
  - `finance-tracker/docs/ui-directions.md`
  - `finance-tracker/frontend/src/components/ui/*`
  - affected feature UI files as needed
- Expected output/result: The frontend has a repeatable UI QA checklist and passes a production-readiness visual review.
- Manual test instructions:
  1. Follow `frontend/QA_CHECKLIST.md` across desktop, tablet, and mobile widths.
  2. Confirm keyboard focus and contrast are acceptable.
  3. Confirm no obvious layout breaks, clipped content, or unreadable charts remain.
- Dependencies: UIX-003, UIX-004, UIX-005, UIX-006, UIX-007

### Feature H1. Quality Hardening

#### Task QLT-001 - Add end-to-end backend smoke coverage for critical user flows
- Description: Add a small high-value test suite covering auth, accounts, transactions, budgets, goals, and reports.
- Files to create/update:
  - `finance-tracker/backend/tests/test_core_smoke.py`
- Expected output/result: One command verifies the most important backend workflows.
- Manual test instructions:
  1. Run the smoke test file.
  2. Confirm all critical flows pass in a clean test database.
- Dependencies: AUTH-004, FIN-005, GOAL-001, BUD-002, REP-002

#### Task QLT-002 - Add frontend smoke checklist and runtime error handling
- Description: Add a structured manual QA checklist plus user-friendly error boundaries and fallback UI states.
- Files to create/update:
  - `finance-tracker/frontend/src/app/ErrorBoundary.jsx`
  - `finance-tracker/frontend/QA_CHECKLIST.md`
  - `finance-tracker/frontend/src/app/AppRoutes.jsx`
- Expected output/result: Frontend failures are easier to diagnose and manual QA becomes repeatable.
- Manual test instructions:
  1. Follow `QA_CHECKLIST.md`.
  2. Temporarily break one API call and confirm the UI fails gracefully.
- Dependencies: REP-003, AI-006

### Feature H2. Release Readiness

#### Task OPS-001 - Add containerized local startup or one-command dev bootstrap
- Description: Add a reproducible local startup path so the app can be launched consistently on a new machine.
- Files to create/update:
  - `finance-tracker/docker-compose.yml` or `finance-tracker/scripts/bootstrap.ps1`
  - `finance-tracker/README.md`
- Expected output/result: A new contributor can start the project without tribal knowledge.
- Manual test instructions:
  1. Follow the bootstrap instructions on a clean shell.
  2. Start backend and frontend.
  3. Confirm the login page and API both respond.
- Dependencies: FDN-005, QLT-001

#### Task OPS-002 - Create production readiness checklist
- Description: Document secrets handling, CORS tightening, debug settings, database migration flow, logging, and backup expectations before deployment.
- Files to create/update:
  - `finance-tracker/docs/production-readiness.md`
  - `finance-tracker/backend/.env.example`
  - `finance-tracker/frontend/.env.example`
- Expected output/result: Clear deployment and hardening checklist for later production rollout.
- Manual test instructions:
  1. Review the checklist line by line.
  2. Confirm every referenced setting exists in code or env templates.
- Dependencies: OPS-001

## 8. First Task to Execute

### Task #1
- ID: `FDN-001`
- Title: `Create canonical rebuild skeleton and architecture notes`
- Why this comes first: We need one agreed structure before touching runtime code, dependencies, or database models. This keeps the rebuild safe and reversible.
- Commit message format: `[FOUNDATION] Add canonical rebuild skeleton and architecture notes`
- Push note: A Git remote is not configured yet. Before enforcing the required push step, add an `origin` remote for this repo.
