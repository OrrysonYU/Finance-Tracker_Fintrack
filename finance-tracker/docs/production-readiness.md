# Fintrack production readiness handbook

This is the release and deployment runbook for the Fintrack SaaS. It describes
how to operate the current Django REST API and React/Vite single-page app
without changing business logic or API contracts. The examples assume the
repository layout `finance-tracker/backend` and `finance-tracker/frontend`.

## 1. Release assumptions and ownership

Fintrack is a stateless React build served by a web server/CDN and a Django
REST API served by a production WSGI/ASGI server. The API uses JWT bearer
tokens, Django ORM migrations, and a project-owned `users.User` model. SQLite
is a local-development option; production data belongs in a managed,
transactional database. Assign an owner for application operations, database
backups, security incidents, and release approval before go-live.

The source of truth for backend Python packages is `backend/requirements.txt`;
the source of truth for frontend packages is `frontend/package-lock.json`.

## 2. Environment variable contract

Copy each `.env.example` only as a starting point. Inject values at runtime
from the platform secret/configuration store (or a protected file with mode
0600). The application loads `backend/.env` if present; process environment
variables take precedence because the loader uses `setdefault`.

### Backend variables

| Variable | Required in production | Meaning and production guidance |
| --- | --- | --- |
| `DJANGO_SETTINGS_MODULE` | Yes | Set to `config.settings.base` for the production-oriented settings module. `config.settings.local` is for development only. |
| `DJANGO_SECRET_KEY` | Yes | Long, random, unique signing key. Store only in a secret manager; rotate using a planned token/session invalidation window. |
| `DJANGO_DEBUG` | No (ignored by base) | `config.settings.local` reads it; keep `False` outside local development. `base` hard-codes `DEBUG=False`. |
| `DJANGO_ALLOWED_HOSTS` | Yes | Comma-separated API hostnames. Use exact DNS names and internal load-balancer names; never `*`. |
| `DJANGO_CORS_ALLOW_ALL_ORIGINS` | Yes | Set `False` in production. The current code supports an all-or-nothing switch, not an origin-list variable. Prefer serving the SPA and API on one origin or enforce an allowlist at the edge. |
| `DJANGO_TIME_ZONE` | Yes | IANA timezone used for presentation and scheduling; `UTC` is the recommended canonical value. |
| `DJANGO_DB_ENGINE` | Yes | Django engine path. Keep SQLite only for local/dev; use a PostgreSQL engine in production after adding an approved PostgreSQL driver to `requirements.txt` (the current manifest does not include one). |
| `DJANGO_DB_NAME` | Yes | Database name or SQLite path. For PostgreSQL use the database name; keep it out of source control. |
| `DJANGO_DB_HOST` | For non-SQLite | Managed database hostname/private endpoint. |
| `DJANGO_DB_PORT` | For non-SQLite | Database port (normally `5432` for PostgreSQL). |
| `DJANGO_DB_USER` | For non-SQLite | Least-privilege application database user. |
| `DJANGO_DB_PASSWORD` | For non-SQLite | Secret-store value; do not print it in logs or diagnostics. |
| `JWT_ACCESS_TOKEN_MINUTES` | Yes | Access-token lifetime. Keep short (the template default is 30 minutes) and tune with measured UX/security needs. |
| `JWT_REFRESH_TOKEN_DAYS` | Yes | Refresh-token lifetime. The current settings rotate refresh tokens and blacklist the old token; keep the lifetime bounded. |
| `AI_INSIGHTS_ENABLED` | No | Feature flag. Keep `False` unless the optional module has been reviewed, tested, and its provider is approved. |
| `AI_INSIGHTS_PROVIDER` | No | Provider identifier consumed by the optional module. Do not place provider API keys in this variable. |

### Frontend variables

| Variable | Required in production | Meaning and production guidance |
| --- | --- | --- |
| `VITE_API_URL` | Yes | Public backend origin used by Axios. Set to an HTTPS URL with no trailing slash. Vite embeds it in the bundle, so it is not secret. |

Keep names and comma-separated formatting consistent with the templates. Any
new setting must be added to the application reader, both examples, and this
table in the same change.

## 3. Secrets, rotation, and access control

- Keep `.env` files out of Git and CI artifacts; verify `.gitignore` and secret
  scanning before every release. Never use example keys in a shared environment.
- Use a managed secret store with audit logs, least-privilege access, and
  separate values for development, staging, and production.
- Rotate `DJANGO_SECRET_KEY`, database credentials, and any future provider
  credentials on a schedule and immediately after suspected exposure. Plan a
  short overlap window or coordinated restart; changing the Django key can
  invalidate signed data and tokens.
- Restrict who can read production secrets, require MFA for the cloud account,
  and do not paste secrets into tickets, chat, crash reports, or shell history.

## 4. Production security configuration

1. Run with `DJANGO_SETTINGS_MODULE=config.settings.base`. Confirm Django
   reports `DEBUG=False` and fail the deployment if it is ever enabled.
2. Set `DJANGO_ALLOWED_HOSTS` to the exact API DNS names. Reject wildcard
   hosts, and configure the load balancer to preserve the original host.
3. Set `DJANGO_CORS_ALLOW_ALL_ORIGINS=False`. The current implementation has
   no origin-list setting; use a same-origin deployment or an edge policy that
   permits only the exact frontend origin. Do not add `*` to production CORS.
4. Terminate TLS at the load balancer or web server, redirect HTTP to HTTPS,
   enable HSTS only after verifying all subdomains are HTTPS, and use modern
   TLS versions/ciphers. Set `VITE_API_URL` to the HTTPS API origin.
5. The API uses Authorization headers rather than Django session cookies. Do
   not move JWTs to non-HttpOnly browser storage without a security review; the
   current SPA stores tokens in `localStorage`, so apply a strict CSP, protect
   against XSS, and keep token lifetimes short. A future migration to secure,
   HttpOnly, SameSite cookies requires coordinated frontend/backend changes.
6. CSRF middleware is enabled by the current base settings. Bearer-token API
   calls are not cookie-authenticated, but admin/session routes still require
   CSRF protection. Keep CSRF middleware enabled, use HTTPS, and if a future
   cookie-based flow is introduced configure Django's trusted origins and
   `Secure`, `HttpOnly`, and appropriate `SameSite` attributes in code.
   `config.settings.base` does not currently set `SECURE_SSL_REDIRECT`, HSTS,
   `SESSION_COOKIE_SECURE`, or `CSRF_COOKIE_SECURE`; the edge must enforce HTTPS
   today, and enabling those Django settings is a follow-up hardening change.
7. Keep Django's clickjacking protection and password validators enabled.
   Restrict `/admin/`, schema, and Swagger routes at the network boundary or
   behind staff authentication if they are not needed publicly.

## 5. Database and migration workflow

1. Build from a reviewed commit and install the locked dependency versions.
2. Take/verify a recent backup and record the restore point before migration.
3. Run `python manage.py check --deploy` and `python manage.py showmigrations`
   in a staging environment configured like production.
4. Apply migrations as a release step with one designated job:
   `python manage.py migrate --noinput`.
5. Start/restart application workers only after migration success. Never run
   migrations concurrently from every web replica.
6. Run smoke tests and the post-deployment checklist below. For destructive or
   long-running schema changes, use an expand/contract migration and a
   separately rehearsed rollback plan.

The committed migration history includes the custom user model and finance
domain migrations. Do not delete or edit an applied migration; create a new
forward migration and test it against a production-sized copy.

## 6. Static files, media, and file storage

The current settings define `STATIC_URL` but not `STATIC_ROOT`. Before using
`python manage.py collectstatic --noinput`, provide `STATIC_ROOT` in a reviewed
deployment settings layer and serve that directory from a CDN/web server, not
Django's development server. The current project does not define a media upload contract;
do not assume local disk is durable. If media is introduced, use private,
encrypted object storage, signed URLs, size/type validation, malware scanning,
retention rules, and a documented deletion process. Mounting a persistent
volume is acceptable only for a deliberately managed single-node deployment.

## 7. Build and dependency management

Use clean, reproducible builds:

```powershell
cd finance-tracker/backend
python -m pip install --requirement requirements.txt
python manage.py check --deploy
python manage.py migrate --noinput
# Run collectstatic only after STATIC_ROOT is supplied by deployment settings.
# python manage.py collectstatic --noinput

cd ../frontend
npm ci
npm run lint
npm run build
```

Publish the frontend `dist/` directory as an immutable artifact. Pin/upgrade
dependencies through review, run tests and vulnerability scanning, and rebuild
when a critical CVE is disclosed. Do not install from an unreviewed working
tree or use `npm install` in CI when a lockfile is available.

## 8. Logging and error reporting

Emit structured application and access logs to stdout/stderr for collection by
the hosting platform. Include timestamp, level, request/correlation ID, route,
status, latency, and deployment version; never log passwords, JWTs, database
URLs, or secret values. Set retention and access controls appropriate to
financial data, and sample noisy health probes. The repository has no Sentry or
external error-reporting integration today: configure one at the platform
boundary or add it in a separately reviewed change, with PII scrubbing and
alert routing before launch.

## 9. Health checks, monitoring, and performance

The current unauthenticated liveness endpoint is `GET /`, which returns the
JSON API-root message. Use it for process/load-balancer liveness. The optional
AI module also exposes `GET /api/ai-insights/health/`; it intentionally returns
`503` while `AI_INSIGHTS_ENABLED=False`, so do not use it as the general API
liveness probe. There is no dedicated database readiness endpoint; validate
database connectivity with a controlled authenticated API smoke test and
`manage.py check`/migration job.
Monitor 4xx/5xx rate, latency percentiles, worker saturation, database
connections/locks, disk, memory, backup age, token refresh failures, and
frontend build/runtime errors. Alert on SLO breaches and failed backups.

Keep API and database in the same region, use connection pooling at the
managed-database layer, enforce pagination (the API default is 20), index
high-volume query fields, and put static assets behind a CDN. Load-test before
raising worker counts; scale horizontally only after confirming migrations,
secret injection, and shared storage are replica-safe.

## 10. Backup, restore, and disaster recovery

- Prefer automated, encrypted, point-in-time backups from a managed PostgreSQL
  service. Define RPO/RTO, retention, regional copies, and who can restore.
- Test a full restore at least quarterly into an isolated account; record the
  time, commands, data checks, and follow-up actions. A backup that has never
  been restored is not a recovery plan.
- Before releases, capture a restore point and verify backup freshness. For a
  SQLite-only deployment, stop writers and copy the database atomically, but
  treat that as a temporary mitigation rather than a SaaS-grade design.
- Document encryption keys, access approvals, schema version, and application
  version alongside each backup. Validate migrations against a restored copy.

## 11. Deployment verification checklist

- [ ] Reviewed commit, dependency lockfiles, release notes, and migration plan.
- [ ] Secret-store values injected; no example or development secret remains.
- [ ] `DJANGO_SETTINGS_MODULE=config.settings.base`, `DEBUG=False`, exact hosts,
      and `DJANGO_CORS_ALLOW_ALL_ORIGINS=False` verified at runtime.
- [ ] HTTPS redirect, certificate renewal, HSTS policy, and security headers
      verified at the edge.
- [ ] Database backup/restore point confirmed; migrations applied once.
- [ ] Static assets collected and served from the intended CDN/web server.
- [ ] `GET /` liveness returns 200; login, refresh, `/api/auth/me/`, and one
      representative finance read/write flow succeed over HTTPS.
- [ ] Logs, metrics, alerts, error reporting, and on-call routing tested.
- [ ] Rate limits/WAF, admin and API documentation exposure, and CORS behavior
      reviewed.

## 12. Post-deployment validation and rollback

Keep the previous frontend artifact, backend image/package, configuration
version, and migration notes available until the release is accepted. If
errors or SLO regressions appear, first stop traffic or disable the release,
then restore the previous application artifact and configuration. Database
rollback is not a simple code rollback: restore from the verified point-in-time
backup or run a tested backward-compatible migration. Preserve logs and the
incident timeline, communicate customer impact, and schedule a follow-up
root-cause review.

After deployment, repeat the smoke flows, inspect error/latency dashboards for
at least one normal traffic window, verify a fresh backup completed, and check
that token refresh and logout behavior remain correct.

## 13. Common deployment mistakes

- Running `config.settings.local`, leaving `DEBUG=True`, or copying `.env.example`
  directly into production.
- Using `DJANGO_ALLOWED_HOSTS=*` or `DJANGO_CORS_ALLOW_ALL_ORIGINS=True`.
- Serving the SPA with an HTTP API URL, mixed content, or an expired TLS cert.
- Running `runserver` in production or launching migrations from every replica.
- Treating SQLite/local disk as highly available storage or skipping restore tests.
- Exposing admin/Swagger/schema publicly without an access policy.
- Logging bearer tokens or database credentials, or putting secrets in `VITE_*`.
- Deploying unpinned dependencies, stale static assets, or an unreviewed migration.

## 14. Future cloud deployment recommendations (not implemented by OPS-002)

The current architecture can be packaged for a managed platform without
changing the API contract. In all cases use a secret manager, managed
PostgreSQL, object storage for media, TLS at the edge, centralized logs, and a
one-shot migration job.

- **AWS:** ECS/Fargate or App Runner for the API, S3 + CloudFront for `dist/`
  and media, RDS PostgreSQL, Secrets Manager, CloudWatch, and an ALB/WAF.
- **Azure:** App Service or Container Apps, Blob Storage + Front Door, Azure
  Database for PostgreSQL, Key Vault, Monitor, and Application Insights.
- **Railway/Render:** separate web/API and static services, managed Postgres,
  platform environment groups, health checks, and a pre-deploy migration
  command. Confirm backup retention and private networking on the selected tier.
- **Docker:** multi-stage frontend build, slim Python runtime, non-root user,
  immutable image tags, health probes, and no secrets in image layers.
- **Kubernetes:** Deployments for API, an ingress with TLS/WAF, Secrets and
  ConfigMaps, a migration Job, PodDisruptionBudgets, resource limits, liveness
  and readiness probes, centralized logs/metrics, and a managed database.

These options require a separate architecture, cost, networking, and threat
model review; OPS-002 does not provision cloud resources.

## 15. Remaining production considerations outside OPS-002

The repository currently lacks an origin-list CORS setting, dedicated database
readiness endpoint, `STATIC_ROOT`, a PostgreSQL driver, application-level
structured logging/error reporter, rate-limit policy, explicit Django HSTS and
secure-cookie settings, cookie-based token transport, and cloud infrastructure
as code. Decide and implement those items in follow-on, security-reviewed work
before a high-compliance or high-volume launch.
