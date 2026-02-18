# Walkthrough - Webhook Security Hardening

I have implemented strict security boundaries for the WhatsApp webhook to reject invalid requests with HTTP 403 Forbidden.

## Changes

### 1. Infrastructure Errors
#### [src/infra/errors.ts](file:///c:/repos/projeto-condstore/src/infra/errors.ts)
- Added `TENANT_NOT_FOUND` error code.
- Added user-facing message "Empresa não encontrada ou inativa".

### 2. Tenant Repository
#### [src/infra/repositories/tenant.repository.ts](file:///c:/repos/projeto-condstore/src/infra/repositories/tenant.repository.ts)
- Updated `resolveTenantByTwilioNumber` to throw `TENANT_NOT_FOUND` (instead of generic error) when a tenant is not found in the database.

### 3. Webhook Logic
#### [src/app/api/webhook/route.ts](file:///c:/repos/projeto-condstore/src/app/api/webhook/route.ts)
- **Signature Validation**: Returns `403 Forbidden` JSON response if signature is missing or invalid.
- **Tenant Resolution**: Returns `403 Forbidden` JSON response if tenant is not found.
- **Other Errors**: Retains `200 OK` (with TwiML error message) for other structural errors to prevent infinite retries from Twilio.

## Verification

### Automated Script
I created a script at `scripts/verify-webhook.mjs` to test these behaviors.

Run it with:
```bash
node scripts/verify-webhook.mjs
```
(Requires server running at `http://localhost:3000`)

### Type Validation
Ran `npx tsc --noEmit` and confirmed no type errors in the modified files.
