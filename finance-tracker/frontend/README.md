# Fintrack Frontend

This frontend is the user-facing application for Fintrack. It currently uses React with Vite and is being rebuilt toward a feature-oriented structure that is easier to test, extend, and maintain.

## Current Stack

- React
- Vite
- Tailwind CSS
- React Query
- Axios
- React Router

## Current Commands

Fintrack frontend is standardized on `npm`.

```powershell
cd frontend
npm install
npm run dev
```

Additional commands:

```powershell
npm run build
npm run lint
```

The canonical lockfile is `package-lock.json`. `pnpm-lock.yaml` is intentionally not used for this rebuild.

## Environment Setup

The frontend environment contract is documented in `.env.example`.

Create a local env file before running the app:

```powershell
cd frontend
Copy-Item .env.example .env
```

Current variable:

- `VITE_API_URL`: backend base URL used by the frontend API client

Default local development value:

```text
VITE_API_URL=http://127.0.0.1:8000
```

## Current User Flows

- register
- login
- dashboard
- accounts
- transactions
- budgets
- saving goals

## Canonical Target Structure

The frontend should evolve toward this structure over time:

```text
frontend/
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

## Frontend Architecture Rules

- Route setup belongs in `src/app/`.
- Shared building blocks belong in `src/components/`.
- Feature-specific UI and API logic belong in `src/features/<feature-name>/`.
- Cross-cutting HTTP setup belongs in `src/lib/`.
- Avoid growing a large catch-all `pages/` directory long-term.

## Design and Behavior Goals

- clear loading states
- clear error states
- mobile-friendly layouts
- small focused components
- API contracts isolated behind feature clients
- AI insights displayed as a separate surface, not mixed invisibly into ledger actions

## Naming Conventions

- Use feature names that match backend domains where possible.
- Prefer names like `TransactionsPage.jsx`, `transaction-form.jsx`, or `api.js` within a feature folder.
- Avoid generic names like `helpers.js` unless the behavior is truly shared and well-defined.

## Manual Frontend Check

For this stage of the rebuild, the minimum manual check is:

1. Remove `node_modules` if you want to verify a clean install.
2. Run `Copy-Item .env.example .env`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open the app in the browser.
6. Confirm the login or register view loads without build errors.

Recommended extra checks:

1. Run `npm run build`.
2. Run `npm run lint`.
