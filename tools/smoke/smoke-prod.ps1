param (
    [Parameter(Mandatory=$true)]
    [string]$BaseUrl,

    [Parameter(Mandatory=$true)]
    [string]$InternalToken,

    [Parameter(Mandatory=$true)]
    [string]$TenantId
)

$ErrorActionPreference = "Stop"

function Log-Info {
    param ([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Log-Pass {
    param ([string]$Message)
    Write-Host "[PASS] $Message" -ForegroundColor Green
}

function Log-Fail {
    param ([string]$Message)
    Write-Host "[FAIL] $Message" -ForegroundColor Red
}

$smokeFailed = $false

Log-Info "Starting Production Smoke Test..."
Log-Info "Target URL: $BaseUrl"
Log-Info "Tenant ID: $TenantId"
Log-Info "Internal Token: ***$($InternalToken.Substring($InternalToken.Length - 4))"

# Check 1: GET /api/internal/health/db sem token => 401
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/internal/health/db" -Method Get -ErrorAction Stop
    Log-Fail "Check 1: GET /api/internal/health/db without token should fail with 401. Got $($response.StatusCode)"
    $smokeFailed = $true
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 401) {
        Log-Pass "Check 1: GET /api/internal/health/db without token returned 401"
    } else {
        Log-Fail "Check 1: Expected 401 but got $statusCode. Error: $_"
        $smokeFailed = $true
    }
}

# Check 2: GET /api/internal/health/db com token => 200
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/internal/health/db" -Method Get -Headers @{ "x-internal-token" = $InternalToken } -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Log-Pass "Check 2: GET /api/internal/health/db with token returned 200"
    } else {
        Log-Fail "Check 2: GET /api/internal/health/db with token returned $($response.StatusCode)"
        $smokeFailed = $true
    }
} catch {
    Log-Fail "Check 2: GET /api/internal/health/db with token failed. Error: $_"
    $smokeFailed = $true
}

# Check 3: GET /api/health => 200
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -Method Get -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Log-Pass "Check 3: GET /api/health returned 200"
    } else {
        Log-Fail "Check 3: GET /api/health returned $($response.StatusCode)"
        $smokeFailed = $true
    }
} catch {
    # If endpoint does not exist yet or fails
    Log-Fail "Check 3: GET /api/health failed. Error: $_"
    $smokeFailed = $true
}

# Check 4: GET /api/internal/health/qdrant com token => 200
try {
    $response = Invoke-WebRequest -Uri "$BaseUrl/api/internal/health/qdrant" -Method Get -Headers @{ "x-internal-token" = $InternalToken } -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Log-Pass "Check 4: GET /api/internal/health/qdrant with token returned 200"
    } else {
        Log-Fail "Check 4: GET /api/internal/health/qdrant with token returned $($response.StatusCode)"
        $smokeFailed = $true
    }
} catch {
    Log-Fail "Check 4: GET /api/internal/health/qdrant with token failed. Error: $_"
    $smokeFailed = $true
}

Write-Host "----------------------------------------"
if ($smokeFailed) {
    Log-Fail "Smoke test completed with ERRORS."
    exit 1
} else {
    Log-Pass "Smoke test completed SUCCESSFULLY."
    exit 0
}
