# Smoke Tests (PowerShell friendly)

This folder contains minimal smoke checks focused on hardening validation in staging/production.

## Quick start (PowerShell)

```powershell
Copy-Item .\tools\smoke\config.example.ps1 .\tools\smoke\config.ps1
# edit config.ps1 and set BASE_URL + INTERNAL_TOKEN

.\tools\smoke\smoke.ps1
```

## Quick start (bash)

```bash
export BASE_URL="https://staging.example.com"
export INTERNAL_TOKEN="..."

./tools/smoke/smoke.sh
```

## Variables (from env or config.ps1)

- BASE_URL (default: http://localhost:3000)
- INTERNAL_TOKEN (required for /api/internal/*)
- TENANT_ID (optional, reserved for future checks)
- SEED_TOKEN (optional fake value to validate seed blocking)
- TWILIO_WEBHOOK_URL (optional endpoint only, no credentials)

## Behavior

- Tokens are never printed; logs are redacted (prefix/suffix only).
- Exit code is non-zero if any required check fails.
- Twilio webhook check is optional and only runs if TWILIO_WEBHOOK_URL is set.
- Rate limiter fallback detection is informational and logs if detected.
