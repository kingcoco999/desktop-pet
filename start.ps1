# Desktop Pet Launcher
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host "     Desktop Pet Launcher" -ForegroundColor Cyan
Write-Host "  ==============================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/4] Checking Node.js ..." -ForegroundColor Yellow
try {
    $nodeVer = & node -v 2>$null
    Write-Host "  OK Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  X Node.js not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[2/4] Checking npm ..." -ForegroundColor Yellow
try {
    $npmVer = & npm -v 2>$null
    Write-Host "  OK npm $npmVer" -ForegroundColor Green
} catch {
    Write-Host "  X npm not found" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "[3/4] Checking dependencies ..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "  Installing dependencies ..." -ForegroundColor Cyan
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X npm install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "  OK Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "  OK Dependencies found" -ForegroundColor Green
}

Write-Host "[4/4] Checking Electron ..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules\electron\dist\electron.exe")) {
    Write-Host "  Installing Electron ..." -ForegroundColor Cyan
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  X Electron install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Write-Host "  OK Electron ready" -ForegroundColor Green

Write-Host ""
Write-Host "  Starting Desktop Pet ..." -ForegroundColor Green
Write-Host "  (Close this window to stop)" -ForegroundColor Gray
Write-Host ""

& npm run dev
Read-Host "Press Enter to exit"
