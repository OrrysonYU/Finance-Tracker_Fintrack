[CmdletBinding()]
param(
    [switch]$SkipInstall,
    [switch]$NoBrowser,
    [int]$BackendPort = 8000,
    [int]$FrontendPort = 5173
)

$ErrorActionPreference = "Stop"

$AppRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $AppRoot "backend"
$FrontendRoot = Join-Path $AppRoot "frontend"
$RuntimeRoot = Join-Path $AppRoot ".fintrack"

function Write-Section([string]$Title) {
    Write-Host ""
    Write-Host "==> $Title" -ForegroundColor Cyan
}

function Fail([string]$Message) {
    throw "$Message`nSee the Quick Start troubleshooting section in README.md."
}

function Assert-Command([string]$Name, [string]$InstallHint) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Fail "$Name was not found. $InstallHint"
    }
}

function Ensure-EnvFile([string]$Directory) {
    $envFile = Join-Path $Directory ".env"
    $exampleFile = Join-Path $Directory ".env.example"
    if ((-not (Test-Path -LiteralPath $envFile)) -and (Test-Path -LiteralPath $exampleFile)) {
        Copy-Item -LiteralPath $exampleFile -Destination $envFile
        Write-Host "Created .env from .env.example in $Directory"
    }
}

function Invoke-Checked([string]$Title, [string]$FilePath, [string[]]$Arguments, [string]$WorkingDirectory) {
    Write-Host $Title
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) { Fail "$Title failed with exit code $LASTEXITCODE." }
    }
    finally { Pop-Location }
}

function Resolve-BackendPython {
    $configured = $env:FINTRACK_BACKEND_PYTHON
    if (-not [string]::IsNullOrWhiteSpace($configured)) {
        if (-not (Test-Path -LiteralPath $configured) -and -not (Get-Command $configured -ErrorAction SilentlyContinue)) {
            Fail "FINTRACK_BACKEND_PYTHON points to '$configured', but that executable does not exist."
        }
        return $configured
    }
    $venvPython = Join-Path $BackendRoot ".venv\Scripts\python.exe"
    if (Test-Path -LiteralPath $venvPython) { return ".\.venv\Scripts\python.exe" }
    Assert-Command "python" "Install Python 3.11 or newer from https://www.python.org/downloads/."
    Invoke-Checked "Create Python virtual environment" "python" @("-m", "venv", ".venv") $BackendRoot
    return ".\.venv\Scripts\python.exe"
}

function Wait-ForUrl([string]$Url, [string]$Service, [int]$TimeoutSeconds = 30) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $response }
        }
        catch { Start-Sleep -Milliseconds 500 }
    } while ((Get-Date) -lt $deadline)
    Fail "$Service did not respond at $Url within $TimeoutSeconds seconds. Check that the process is running and retry with the manual startup commands in README.md."
}

function Test-BackendFrontendConnectivity([int]$Port) {
    try {
        $response = Invoke-WebRequest -Uri "http://127.0.0.1:$Port/api/schema/" -Headers @{ Origin = "http://127.0.0.1:$FrontendPort" } -UseBasicParsing -TimeoutSec 5
        if (-not $response.Headers["Access-Control-Allow-Origin"]) {
            Fail "The frontend can reach the backend, but the backend did not return CORS headers for the frontend origin. Check DJANGO_CORS_ALLOW_ALL_ORIGINS."
        }
    }
    catch {
        if ($_.Exception.Message -like "The frontend can reach*") { throw }
        Fail "Frontend-backend connectivity check failed: $($_.Exception.Message)"
    }
}

function Stop-ExistingProcess([string]$PidFile) {
    if (-not (Test-Path -LiteralPath $PidFile)) { return }
    try {
        $record = Get-Content -LiteralPath $PidFile -Raw | ConvertFrom-Json
        foreach ($property in @("BackendPid", "FrontendPid")) {
            $processId = [int]$record.$property
            if ($processId -ne $PID) { Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue }
        }
    }
    catch { Write-Host "Existing Fintrack process metadata could not be read; continuing." -ForegroundColor Yellow }
    Remove-Item -LiteralPath $PidFile -Force -ErrorAction SilentlyContinue
}

Write-Section "Fintrack local development bootstrap"
Write-Host "Application root: $AppRoot"
if (-not (Test-Path -LiteralPath (Join-Path $BackendRoot "manage.py"))) { Fail "Backend manage.py was not found under $BackendRoot." }
if (-not (Test-Path -LiteralPath (Join-Path $FrontendRoot "package.json"))) { Fail "Frontend package.json was not found under $FrontendRoot." }

Assert-Command "node" "Install Node.js 20 LTS or newer from https://nodejs.org/."
Assert-Command "npm" "Install Node.js 20 LTS or newer from https://nodejs.org/."
Ensure-EnvFile $BackendRoot
Ensure-EnvFile $FrontendRoot

$backendPython = Resolve-BackendPython
if (-not $SkipInstall) {
    Invoke-Checked "Install backend dependencies" $backendPython @("-m", "pip", "install", "-r", "requirements.txt") $BackendRoot
    if (-not (Test-Path -LiteralPath (Join-Path $FrontendRoot "node_modules"))) {
        Invoke-Checked "Install frontend dependencies" "npm" @("ci") $FrontendRoot
    }
}

Invoke-Checked "Django system check" $backendPython @("manage.py", "check") $BackendRoot
Invoke-Checked "Apply database migrations" $backendPython @("manage.py", "migrate", "--noinput") $BackendRoot

if ($env:FINTRACK_ADMIN_USERNAME -and $env:FINTRACK_ADMIN_PASSWORD) {
    $adminEmail = if ($env:FINTRACK_ADMIN_EMAIL) { $env:FINTRACK_ADMIN_EMAIL } else { "$($env:FINTRACK_ADMIN_USERNAME)@localhost" }
    $shell = "from django.contrib.auth import get_user_model; User=get_user_model(); u,created=User.objects.get_or_create(username='$($env:FINTRACK_ADMIN_USERNAME)', defaults={'email':'$adminEmail','is_staff':True,'is_superuser':True}); u.email='$adminEmail'; u.is_staff=True; u.is_superuser=True; u.set_password('$($env:FINTRACK_ADMIN_PASSWORD)'); u.save(); print('Development admin ' + ('created' if created else 'verified'))"
    Invoke-Checked "Create or verify development admin" $backendPython @("manage.py", "shell", "-c", $shell) $BackendRoot
}

New-Item -ItemType Directory -Path $RuntimeRoot -Force | Out-Null
$pidFile = Join-Path $RuntimeRoot "processes.json"
Stop-ExistingProcess $pidFile
$backend = Start-Process -FilePath $backendPython -ArgumentList @("manage.py", "runserver", "127.0.0.1:$BackendPort", "--noreload") -WorkingDirectory $BackendRoot -WindowStyle Hidden -PassThru
$frontend = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "$FrontendPort") -WorkingDirectory $FrontendRoot -WindowStyle Hidden -PassThru
@{ BackendPid = $backend.Id; FrontendPid = $frontend.Id } | ConvertTo-Json | Set-Content -LiteralPath $pidFile

try {
    $null = Wait-ForUrl "http://127.0.0.1:$BackendPort/" "Django backend"
    $null = Wait-ForUrl "http://127.0.0.1:$BackendPort/api/schema/" "Django API"
    $null = Wait-ForUrl "http://127.0.0.1:$FrontendPort/login" "Vite frontend"
    Test-BackendFrontendConnectivity $BackendPort
}
catch {
    Stop-ExistingProcess $pidFile
    throw
}

Write-Section "Fintrack is running"
Write-Host "Frontend:    http://127.0.0.1:$FrontendPort/login"
Write-Host "Backend API: http://127.0.0.1:$BackendPort/api/docs/"
Write-Host "Django Admin: http://127.0.0.1:$BackendPort/admin/"
Write-Host "Stop with:   Get-Content '$pidFile' | ConvertFrom-Json | ForEach-Object { Stop-Process -Id `$_.BackendPid,`$_.FrontendPid -Force }"

if (-not $NoBrowser) {
    try { Start-Process "http://127.0.0.1:$FrontendPort/login" | Out-Null } catch { Write-Host "Open the frontend URL manually in your browser." -ForegroundColor Yellow }
}
