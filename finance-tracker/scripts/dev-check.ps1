$ErrorActionPreference = "Stop"

$AppRoot = Split-Path -Parent $PSScriptRoot
$BackendRoot = Join-Path $AppRoot "backend"
$FrontendRoot = Join-Path $AppRoot "frontend"

function Write-Section {
    param([string]$Title)

    Write-Host ""
    Write-Host "==> $Title"
}

function Invoke-NativeCommand {
    param(
        [string]$Title,
        [string]$FilePath,
        [string[]]$Arguments,
        [string]$WorkingDirectory
    )

    Write-Section $Title
    Push-Location $WorkingDirectory
    try {
        & $FilePath @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "$Title failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}

function Ensure-EnvFile {
    param([string]$Directory)

    $envFile = Join-Path $Directory ".env"
    $exampleFile = Join-Path $Directory ".env.example"

    if ((-not (Test-Path $envFile)) -and (Test-Path $exampleFile)) {
        Copy-Item $exampleFile $envFile
        Write-Host "Created $(Resolve-Path -Relative $envFile) from .env.example"
    }
}

function Resolve-BackendPython {
    $configuredPython = $env:FINTRACK_BACKEND_PYTHON
    if (-not [string]::IsNullOrWhiteSpace($configuredPython)) {
        return $configuredPython
    }

    $venvPython = Join-Path $BackendRoot ".venv\Scripts\python.exe"
    if (Test-Path $venvPython) {
        return $venvPython
    }

    $systemPython = Get-Command python -ErrorAction SilentlyContinue
    if ($systemPython) {
        return "python"
    }

    throw "Python was not found. Create backend\.venv or set FINTRACK_BACKEND_PYTHON."
}

Write-Section "Fintrack smoke checks"
Write-Host "App root: $AppRoot"

Ensure-EnvFile $BackendRoot
Ensure-EnvFile $FrontendRoot

$backendPython = Resolve-BackendPython
Write-Host "Backend Python: $backendPython"

Invoke-NativeCommand "Backend Django system check" $backendPython @("manage.py", "check") $BackendRoot
Invoke-NativeCommand "Backend test suite" $backendPython @("manage.py", "test", "--settings=config.settings.test") $BackendRoot
Invoke-NativeCommand "Frontend lint and production build" "cmd" @("/c", "npm run check") $FrontendRoot

Write-Section "Smoke checks passed"
