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

Package manager standardization is still pending and will be cleaned up in a later foundation task.

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

1. Start the frontend with `npm run dev`.
2. Open the app in the browser.
3. Confirm the login or register view loads without build errors.
