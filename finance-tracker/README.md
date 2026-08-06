# Fintrack

Fintrack is an AI-powered personal finance tracker with a Django/DRF backend and a React/Vite frontend. This directory is the application root; the repository-level project plan is in `../PROJECT_PLAN.md`.

## Quick Start

The supported local workflow is a single PowerShell command. It is repeatable: environment files are created only when missing, migrations are safe to re-run, and existing Fintrack dev processes are replaced.

### Prerequisites

- Windows PowerShell 5.1 or PowerShell 7+
- Python 3.11+ (3.12+ recommended)
- Node.js 20 LTS+ and npm (the project uses the lockfile with `npm ci`)
- A browser; Docker is not required for local development

Confirm the tools are available:

```powershell
python --version
node --version
npm --version
```

### Installation and environment setup

From the repository root, enter this directory and run the bootstrap script:

```powershell
cd finance-tracker
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1
```

The script will:

1. Create `backend/.venv` when it does not exist and install `backend/requirements.txt`.
2. Copy `backend/.env.example` and `frontend/.env.example` to `.env` when those files are absent.
3. Install frontend packages with `npm ci` when `frontend/node_modules` is absent.
4. Run `manage.py check` and apply all migrations.
5. Start Django and Vite as background development processes.
6. Verify the backend root, API schema, and `/login` frontend route respond.

Use `-SkipInstall` for a fast restart after dependencies are already installed, or `-NoBrowser` to suppress opening a browser:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1 -SkipInstall -NoBrowser
```

To create a local Django admin non-interactively, set these variables before bootstrapping (the user is created or updated idempotently):

```powershell
$env:FINTRACK_ADMIN_USERNAME = "admin"
$env:FINTRACK_ADMIN_PASSWORD = "use-a-local-only-password"
$env:FINTRACK_ADMIN_EMAIL = "admin@localhost" # optional
```

The password is never stored in the repository. If these variables are not set, create an administrator manually with `python manage.py createsuperuser`.

### Manual startup (fallback)

```powershell
cd finance-tracker
Copy-Item backend/.env.example backend/.env -ErrorAction SilentlyContinue
Copy-Item frontend/.env.example frontend/.env -ErrorAction SilentlyContinue
cd backend
python -m venv .venv                         # first run only
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

In a second terminal:

```powershell
cd finance-tracker\frontend
npm ci                                         # first run only
npm run dev -- --host 127.0.0.1 --port 5173
```

### Development URLs

| Service | URL |
| --- | --- |
| Frontend login | http://127.0.0.1:5173/login |
| Backend API | http://127.0.0.1:8000/api/docs/ |
| Backend root health | http://127.0.0.1:8000/ |
| OpenAPI schema | http://127.0.0.1:8000/api/schema/ |
| API documentation | http://127.0.0.1:8000/api/docs/ |
| Django Admin | http://127.0.0.1:8000/admin/ |

### Environment variables

For local development the bootstrap-created files work as-is. The supported variables are:

| Variable | Required | Local default/purpose |
| --- | --- | --- |
| `VITE_API_URL` | Yes (frontend) | `http://127.0.0.1:8000` |
| `DJANGO_SECRET_KEY` | Yes (backend) | Replace the example value outside a disposable local database |
| `DJANGO_SETTINGS_MODULE` | No | `config.settings.local` |
| `DJANGO_DEBUG` | No | `True` |
| `DJANGO_ALLOWED_HOSTS` | No | `127.0.0.1,localhost` |
| `DJANGO_CORS_ALLOW_ALL_ORIGINS` | No | `True` for local frontend access |
| `DJANGO_DB_*` | No | SQLite `db.sqlite3` by default; set the engine/connection values for another database |
| `FINTRACK_ADMIN_USERNAME/PASSWORD` | No | Optional bootstrap-created development admin |

See `backend/.env.example` for JWT, timezone, and optional AI settings.

### Stop the application

The bootstrap records process IDs in `.fintrack/processes.json`. Stop both services with:

```powershell
$p = Get-Content .\.fintrack\processes.json | ConvertFrom-Json
Stop-Process -Id $p.BackendPid,$p.FrontendPid -Force -ErrorAction SilentlyContinue
```

You can also close the terminals/processes or reboot; `.fintrack` contains only local runtime metadata and logs.

## Project structure

```text
finance-tracker/
  backend/              Django project, domain apps, migrations, tests
    config/             Split base/local/test settings and URL configuration
    users/ finance/     budgets/ reports/ apps/ai_insights/
  frontend/             React application and Vite configuration
    src/features/       Auth, dashboard, accounts, transactions, budgets, goals, reports
  scripts/bootstrap.ps1 Reproducible local startup and smoke checks
  docs/                 Architecture and project notes
```

Business logic remains in the existing backend apps and frontend feature modules; the bootstrap only provisions and starts them.

## Troubleshooting

- **Python or Node is not found:** install the prerequisite and reopen PowerShell so `PATH` is refreshed.
- **PowerShell blocks scripts:** use `powershell -ExecutionPolicy Bypass -File .\scripts\bootstrap.ps1` for this invocation.
- **Port already in use:** rerun with `-BackendPort 8001 -FrontendPort 5174`, then update `frontend/.env` (`VITE_API_URL=http://127.0.0.1:8001`) before starting.
- **Dependency installation fails:** remove only `backend/.venv` or `frontend/node_modules` and rerun; inspect the npm/pip error for a proxy or index issue.
- **A service fails its smoke check:** inspect the process output from a manual startup, then retry the bootstrap. The script cleans up processes when a check fails.
- **Login redirects or API calls fail:** ensure both `.env` files exist, `VITE_API_URL` matches the backend port, and backend `DJANGO_CORS_ALLOW_ALL_ORIGINS=True` is enabled for local development.
- **Database issues:** stop the services, confirm `DJANGO_DB_NAME` points to a writable SQLite path, then rerun migrations with `python manage.py migrate`.

## Engineering checks

Backend checks and tests:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py test --settings=config.settings.test
```

Frontend checks:

```powershell
cd frontend
npm run check
```

## Future production deployment recommendations

For production, package the backend and frontend into separate immutable Docker images, use a managed PostgreSQL database and object storage, and keep secrets in a managed secret store. Add CI/CD gates for linting, tests, migrations, image vulnerability scanning, and deployment health checks; serve the built frontend through a CDN/reverse proxy and run Django behind a production WSGI/ASGI server. These deployment changes are intentionally outside OPS-001.
