# Fintrack Frontend Release QA Checklist

Use this checklist for every production candidate that changes frontend code, design tokens, content, or API-backed UI behavior. Record the release identifier, tester, date, browser versions, and linked defects before sign-off.

## 1. Release record

- Release or commit:
- Environment and API base URL:
- Tester and date:
- Browsers and versions:
- Operating systems:
- Assistive technology used:
- Open defects or accepted risks:

Mark each item as **Pass**, **Fail**, **Not applicable**, or **Blocked**. A blocked or failed critical-flow, accessibility, console, build, or data-integrity check prevents production sign-off.

## 2. Automated gates

Run from `finance-tracker/frontend`:

```powershell
npm ci
npm run lint
npm run build
npm run check
```

- [ ] Dependency installation completes without an unresolved lockfile error.
- [ ] Lint completes with zero errors.
- [ ] Production build completes with zero errors.
- [ ] Build output contains no unexpected large-chunk warning or missing asset warning.
- [ ] The production preview starts and every route loads after a direct browser refresh.
- [ ] No temporary screenshots, logs, fixtures, debug controls, or generated test artifacts are tracked.

## 3. Browser and viewport matrix

Test current stable Chrome or Edge and Firefox. Include Safari on macOS/iOS when it is a supported release target.

| Class | Suggested viewport | Required review |
| --- | --- | --- |
| Large desktop | 1440 x 900 | Full sidebar, wide grids, charts, tables |
| Laptop | 1280 x 800 | Content density, sticky regions, no collisions |
| Tablet landscape | 1024 x 768 | Shell transition, two-column layouts, forms |
| Tablet portrait | 768 x 1024 | Mobile navigation, cards, chart readability |
| Mobile | 390 x 844 | Touch use, single-column flow, dialogs |
| Minimum supported | 320 x 568 | Reflow, long values, no page overflow |

At every size:

- [ ] There is no page-level horizontal scrolling.
- [ ] Content is not clipped, overlapped, or hidden behind sticky navigation.
- [ ] Long account names, category names, descriptions, currencies, and financial values remain understandable.
- [ ] Cards and controls align to the shared spacing grid without broken gaps.
- [ ] Dialogs remain within the viewport and scroll internally when necessary.
- [ ] Opening the mobile drawer locks background scrolling; closing it restores scrolling.
- [ ] Charts resize without illegible labels or cropped tooltips.
- [ ] Tables switch to their designed compact or card presentation before columns become unreadable.
- [ ] Landscape and portrait rotation preserve the current task and entered form values.

Also test at 200% browser zoom and with the viewport narrowed to approximately 320 CSS pixels:

- [ ] Content reflows without loss of information or functionality.
- [ ] Focus indicators and validation messages are not obscured.
- [ ] Text does not require two-dimensional scrolling.

## 4. Global shell and navigation

- [ ] The first keyboard focus is the skip link; activating it moves focus to main content.
- [ ] Desktop sidebar links have clear default, hover, active, and focus states.
- [ ] The active destination is conveyed by more than color.
- [ ] Mobile menu exposes `aria-expanded`, opens the named navigation dialog, and initially focuses a visible control in the drawer.
- [ ] Tab and Shift+Tab stay inside the open drawer.
- [ ] Escape and the visible close button close the drawer and restore focus to the menu button.
- [ ] Route changes close the mobile drawer and update the browser document title.
- [ ] Browser Back and Forward preserve correct navigation state.
- [ ] Sign out is keyboard operable, returns to sign-in, and protected routes redirect appropriately.

## 5. Authentication

Check sign-in and registration with valid, invalid, empty, and API-failure responses.

- [ ] Each page has one clear `h1` and a logical heading hierarchy.
- [ ] Every field has a persistent visible label and correct autocomplete purpose.
- [ ] Required, invalid, disabled, and loading states are clear without relying on color.
- [ ] Submitting invalid data focuses the first invalid field.
- [ ] Field errors are programmatically associated with their inputs and announced.
- [ ] API and connection errors preserve entered values and remain visible until resolved.
- [ ] Show/hide password works by keyboard and exposes its pressed state.
- [ ] Password managers, paste, autofill, and Enter-to-submit continue to work.
- [ ] Duplicate submissions are prevented while a request is pending.
- [ ] Sign-in and registration layouts remain usable at every matrix viewport.

## 6. Product-area smoke pass

Run each area with empty data, representative data, long labels, large positive and negative values, loading responses, and failed responses where the environment permits.

### Dashboard

- [ ] Summary values, period, currency, and generated time are correct and scannable.
- [ ] Refresh exposes a pending state without removing stable content unnecessarily.
- [ ] Empty, loading, full, and error states retain page context and a valid next action.
- [ ] Cash-flow and category charts match their visible and screen-reader data alternatives.
- [ ] Recent transactions, budget, goal, account, health, and AI panels degrade independently.

### Accounts

- [ ] Search, type filter, and sorting work with keyboard and long account names.
- [ ] Add and edit forms expose their expanded state and receive focus predictably.
- [ ] Client and API validation identify the affected field.
- [ ] Create, edit, view-ledger, and delete-confirmation paths work without balance-format regressions.
- [ ] Empty, no-results, loading, success, delete-error, and list states are distinct.

### Transactions

- [ ] Search debounce, account/direction filters, advanced filters, reset, sort, and pagination work together.
- [ ] The advanced-filter control exposes expanded state and the controlled region.
- [ ] Desktop table headers, sort state, row selection, bulk actions, and action menus are keyboard operable.
- [ ] Mobile cards retain transaction, category, account, date, amount, selection, and actions.
- [ ] Add/edit direction, account, amount, category, time, and description fields validate accessibly.
- [ ] Details and delete dialogs trap focus, support Escape where safe, and restore focus.
- [ ] Loading, no-account, no-result, error, partial-delete, and success states are understandable.

### Budgets

- [ ] Create-form disclosure state, period selection, custom dates, category limits, and remove/add-category controls work by keyboard.
- [ ] Duplicate category selection is prevented and amount constraints are explained.
- [ ] Summary, budget cards, utilization progress, loading, empty, and error states remain coherent.
- [ ] Detail disclosures expose expanded state and their controlled region.

### Goals

- [ ] Create-form disclosure state and name, target, saved amount, currency, date, and description fields work by keyboard.
- [ ] Progress and forecast information include text, not color alone.
- [ ] Empty, loading, error, list, API-validation, and delete-confirmation states are clear.

### Reports

- [ ] Reporting month limits future dates and refreshes all dependent views.
- [ ] Summary, cash-flow chart, category chart, and category table agree on period, currency, and totals.
- [ ] Category data remains available as a table or structured mobile list.
- [ ] Loading, empty-series, partial-chart error, and report error states remain readable.

### AI Insights

- [ ] Guidance is explicitly read-only, explainable, and visually separated from recorded facts.
- [ ] Warnings, observations, recommendations, opportunities, and achievements use text labels in addition to tone.
- [ ] Loading, unavailable, partial-source, empty-group, refresh, and full-data states are clear.
- [ ] Core finance workflows remain usable when insight services fail.

## 7. Shared components and states

- [ ] Buttons have visible hover, active, focus, disabled, and loading states.
- [ ] Standard inputs, selects, textareas, and search controls have a focus indicator with at least 3:1 contrast.
- [ ] Normal text meets 4.5:1 contrast; large text and non-text UI meet their applicable WCAG 2.2 AA thresholds.
- [ ] Semantic badges, alerts, progress, and financial direction never rely on color alone.
- [ ] Action menus support arrow keys, Escape, selection, disabled items, and focus return.
- [ ] Confirmation dialogs have an accessible name and description and prevent duplicate confirmation.
- [ ] Loading regions expose status/busy semantics without announcing every skeleton element.
- [ ] Empty states identify first use, no results, unavailable data, or completed states correctly.
- [ ] Error states say what failed, the impact, and a safe next action without exposing internals.
- [ ] Success notices state what changed and can be dismissed by keyboard when dismissal is offered.

## 8. Keyboard and screen-reader pass

Complete one full critical flow without a pointer: sign in, open navigation, visit each primary route, create or edit one supported record, inspect a table/card action, open and close a dialog, and sign out.

- [ ] Tab order follows visual and task order with no unreachable or unexpected stops.
- [ ] Focus is always visible and never moves behind an overlay.
- [ ] No keyboard trap exists outside a modal dialog or navigation drawer.
- [ ] Icon-only controls have concise accessible names; decorative icons are ignored.
- [ ] Landmarks, page headings, regions, lists, forms, tables, and dialogs are announced correctly.
- [ ] Table captions, column headers, sort direction, selection controls, and busy states are announced.
- [ ] Chart purpose and underlying values are available without interpreting the graphic.
- [ ] Status, loading, success, and error announcements are useful and not duplicated excessively.

Representative screen-reader coverage should include NVDA with Chrome or Firefox on Windows and VoiceOver with Safari on Apple platforms when available.

## 9. Motion, preferences, and input modes

- [ ] With `prefers-reduced-motion: reduce`, entrance motion, shimmer, spinning, smooth scrolling, and hover translation are removed or effectively instantaneous.
- [ ] Removing animation does not hide content or delay state changes.
- [ ] Touch targets meet WCAG 2.2 minimum sizing or spacing and primary mobile actions aim for 44 x 44 CSS pixels.
- [ ] Date, numeric, email, and currency fields expose appropriate mobile keyboards.
- [ ] Hover-only information has an equivalent keyboard/touch path.

## 10. Resilience and failure drills

Run these drills against a local production preview or a dedicated QA environment. Never run destructive mutation tests against production data. Record the route, injected condition, observed result, console output, and recovery result for each drill.

### React rendering and route failures

Use a temporary local-only component that throws during render and substitute it for one lazy route element in `src/app/AppRoutes.jsx`. The smallest fixture is:

```jsx
function QARenderFailure() {
  throw new Error("QLT-002 render failure drill");
}
```

Restore the route and remove the fixture immediately after the drill; `git diff` must show no fixture before sign-off.

- [ ] Opening the injected route shows the branded recovery screen instead of a blank page or browser error.
- [ ] The recovery copy contains no stack trace, exception message, endpoint, token, user record, or other technical detail.
- [ ] Focus moves to the recovery heading, then Tab reaches **Retry** and **Return to Dashboard** in visual order.
- [ ] **Retry** clears the captured failure and renders the route after the injected throw is disabled.
- [ ] **Return to Dashboard** performs a clean dashboard navigation/reload and preserves the authenticated session where valid.
- [ ] Browser Back or navigation to a different path resets the route boundary and does not leave stale recovery UI behind.
- [ ] Repeat once for an authenticated route and once for an authentication route.
- [ ] Repeat with `prefers-reduced-motion: reduce`; recovery remains immediate, legible, and fully operable.
- [ ] A rejected or missing lazy-loaded route chunk reaches the same safe fallback, and a fresh deployment/reload can recover it.

### Network and API failures

Use browser request blocking, offline mode, or a QA proxy to test each condition. Do not edit endpoint URLs in committed source.

| Failure | Expected result |
| --- | --- |
| Offline or DNS failure | The affected feature shows a contextual error and retry action; the shell remains usable. |
| HTTP 400/422 | The form remains open, entered values are preserved, and useful validation is associated with the affected field or form. |
| HTTP 401 with valid refresh token | One refresh attempt completes and the original request resumes without duplicate mutations. |
| HTTP 401 with invalid refresh token | Tokens are cleared once, the session-expired message is shown, and sign-in is available. |
| HTTP 403 | The user sees a safe failure state; restricted content and technical response details are not exposed. |
| HTTP 404 | The affected record/action fails locally without crashing the route. |
| HTTP 409 | The conflicting create/update/delete remains recoverable and is not silently reported as success. |
| HTTP 429 | Duplicate requests stop; retry remains possible after the service allows it. |
| HTTP 500/502/503/504 | Stable content remains where designed, a retry is offered, and no optimistic mutation is falsely confirmed. |
| Timeout or aborted request | Pending controls become usable again and the user can retry without reloading the whole application. |
| Partial dashboard/AI failure | Independent panels degrade independently and core finance workflows remain usable. |

- [ ] Retry does not create duplicate accounts, transactions, budgets, goals, or authentication submissions.
- [ ] Query retry behavior does not create a request storm; mutations are never automatically repeated without an explicit safe design.
- [ ] Loading indicators end after terminal failures and `aria-busy` is cleared.
- [ ] Error messages do not claim data is saved, deleted, or refreshed unless the server confirmed it.
- [ ] Returning online and choosing retry restores the feature without stale or duplicated rows.

### Missing, malformed, and extreme data

Use QA fixtures or response overrides; never alter production records solely for fault injection.

- [ ] Test `null`, omitted optional fields, empty objects, empty arrays, and paginated responses with no `results`.
- [ ] Test a collection field with an invalid non-array value and an item missing its identifier or display label.
- [ ] Test invalid dates, unknown enum values, non-numeric amounts, zero, negative values, and very large values.
- [ ] Test mixed currencies, long Unicode labels, right-to-left text, emoji, and descriptions without whitespace.
- [ ] Invalid optional data produces a neutral placeholder or contained recovery state; it never produces `NaN`, `Invalid Date`, `[object Object]`, or a blank application.
- [ ] Invalid critical data is contained by the route boundary, does not expose the payload, and recovery actions remain operable.
- [ ] Tables, charts, summaries, and mobile cards agree after valid data is restored and refreshed.

### Failure evidence and cleanup

- [ ] Capture the request/correlation identifier when the API provides one, without recording access tokens or personal financial data.
- [ ] Record whether the failure was caught by a feature state, route boundary, or global boundary.
- [ ] Confirm no uncaught promise rejection remains after each API drill.
- [ ] Remove all temporary fault fixtures, request overrides, local storage flags, screenshots, logs, and proxy rules.
- [ ] Run `git status --short`, lint, and the production build again after cleanup.

## 11. Runtime and final sign-off

- [ ] Review every primary route in the production build, not only the development server.
- [ ] Direct-refresh every route and confirm lazy-loaded chunks resolve successfully.
- [ ] Browser console contains no React warnings, uncaught exceptions, failed asset loads, or accessibility-related component warnings.
- [ ] Expected boundary drills produce one diagnosable caught error only; no repeated render loop or sensitive data appears in logging.
- [ ] Network failures produce intentional UI states rather than blank regions or unhandled errors.
- [ ] No unexpected layout shift occurs after fonts, data, or route chunks load.
- [ ] Existing APIs, routing, mutations, query invalidation, and financial calculations behave unchanged.
- [ ] Any non-blocking recommendation is documented with owner, priority, and target release.

### Sign-off

- Product/design:
- Frontend engineering:
- Accessibility:
- QA:
- Resilience drills completed by/date:
- Production UI status: Ready / Ready with accepted non-blockers / Not ready
