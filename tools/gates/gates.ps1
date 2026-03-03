# CONDSTORE OS — Local Quality Gates (PowerShell)
# Run this before pushing to verify all guardrails pass.
# Usage: powershell -File tools/gates/gates.ps1

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " CONDSTORE OS — Quality Gates" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

function Run-Gate {
    param([string]$Name, [string]$Command)
    Write-Host "`n>> Gate: $Name" -ForegroundColor Yellow
    Invoke-Expression $Command
    if ($LASTEXITCODE -ne 0) {
        Write-Host "FAILED: $Name" -ForegroundColor Red
        exit 1
    }
    Write-Host "PASSED: $Name" -ForegroundColor Green
}

Run-Gate "TypeCheck" "npm run typecheck"
Run-Gate "Lint" "npm run lint"
Run-Gate "Test:CI" "npm run test:ci"
Run-Gate "Build" "npm run build"

# Optional gates (run only if scripts exist)
if (Test-Path "scripts/routes-verify.ts") {
    Run-Gate "Routes Verify" "npm run routes:verify"
}
if (Test-Path "scripts/check-env-leak.mjs") {
    Run-Gate "Env Leak Check" "node scripts/check-env-leak.mjs"
}

Write-Host "`n========================================" -ForegroundColor Green
Write-Host " ALL GATES PASSED" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
