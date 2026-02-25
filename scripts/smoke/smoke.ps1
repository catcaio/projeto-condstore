$ErrorActionPreference = 'Stop'

$scriptPath = Join-Path $PSScriptRoot 'smoke.mjs'

Write-Host "[smoke] Running HTTP smoke test wrapper (PowerShell)"
if (-not $env:BASE_URL) {
  Write-Host "[smoke] BASE_URL not set; using default http://localhost:3000"
}

node $scriptPath
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
  Write-Host "[smoke] Completed successfully"
} else {
  Write-Host "[smoke] Failed (exit code $exitCode)"
}

exit $exitCode
