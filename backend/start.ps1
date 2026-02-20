# SupportIQ Backend - launch script with pre-flight status checks
# Usage:  .\start.ps1

function OK   ($m) { Write-Host "  [OK]   $m" -ForegroundColor Green  }
function WAIT ($m) { Write-Host "  [ . ]  $m" -ForegroundColor Yellow }
function FAIL ($m) { Write-Host "  [FAIL] $m" -ForegroundColor Red    }
function HDR  ($m) { Write-Host "`n=====  $m  =====" -ForegroundColor Cyan }

HDR "SupportIQ - Pre-flight Checks"

# 1. venv
$PYTHON = "D:\ai-support-chatbot\.venv\Scripts\python.exe"
$PIP    = "D:\ai-support-chatbot\.venv\Scripts\pip.exe"
$ROOT   = $PSScriptRoot
WAIT "Virtual environment ..."
if (Test-Path $PYTHON) {
    $ver = & $PYTHON --version 2>&1
    OK "venv found  ($ver)"
} else {
    FAIL "venv not found at $PYTHON"
    FAIL "Run: python -m venv .venv  then  pip install -r requirements.txt"
    exit 1
}

# 2. .env
WAIT "Checking .env file ..."
$envFile = Join-Path $ROOT ".env"
if (Test-Path $envFile) {
    $hasGroq = Select-String -Path $envFile -Pattern "^GROQ_API_KEY=.+" -Quiet
    if ($hasGroq) { OK ".env present and GROQ_API_KEY is set" }
    else          { FAIL ".env exists but GROQ_API_KEY is missing or empty" }
} else {
    FAIL ".env not found - copy .env.example and fill in your keys"
    exit 1
}

# 3. uvicorn
WAIT "Checking uvicorn ..."
$uvVer = & $PYTHON -c "import uvicorn; print(uvicorn.__version__)" 2>&1
if ($LASTEXITCODE -eq 0) {
    OK "uvicorn $uvVer"
} else {
    FAIL "uvicorn not installed - installing now ..."
    & $PIP install "uvicorn[standard]>=0.34.0" --quiet
    if ($LASTEXITCODE -eq 0) { OK "uvicorn installed" }
    else { FAIL "uvicorn install failed"; exit 1 }
}

# 4. service imports
WAIT "Verifying service imports ..."
$importScript = "from app.services.rag_service import RagService; from app.services.nl2sql_service import NL2SQLService; from app.services.language_service import LanguageService; print('ok')"
$importCheck  = & $PYTHON -c $importScript 2>&1
if ("$importCheck" -match "ok") {
    OK "All service imports OK"
} else {
    FAIL "Import error detected:"
    Write-Host $importCheck -ForegroundColor Red
    exit 1
}

# 5. PostgreSQL
WAIT "Checking PostgreSQL on port 5432 ..."
$pgConn = Test-NetConnection -ComputerName localhost -Port 5432 -InformationLevel Quiet -WarningAction SilentlyContinue 2>$null
if ($pgConn) { OK "PostgreSQL reachable" }
else         { FAIL "PostgreSQL NOT reachable - make sure it is running" }

# 6. ChromaDB
WAIT "Checking ChromaDB on port 8001 ..."
try {
    $r = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/heartbeat" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    OK "ChromaDB is reachable"
} catch {
    FAIL "ChromaDB NOT reachable - run:  docker compose up chromadb -d"
}

HDR "All checks done - starting SupportIQ Backend on :8000"
Write-Host ""

Set-Location $ROOT
& $PYTHON -m uvicorn main:app --reload --port 8000
