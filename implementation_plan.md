# Implementation Plan - Webhook Security Hardening

## Goal
Enforce strict security boundaries in the WhatsApp webhook by returning HTTP 403 for invalid signatures and unknown tenants.

## User Review Required
> [!IMPORTANT]
> This change will cause the webhook to return HTTP 403 Forbidden for:
> 1. Requests with invalid or missing Twilio signatures.
> 2. Requests from phone numbers used by unknown tenants.
>
> **Verify:** Ensure your Twilio Console configuration expects this behavior. Twilio may retry on 403 depending on configuration, but this is the requested security boundary.

## Proposed Changes

### Infrastructure
#### [MODIFY] [errors.ts](file:///c:/repos/projeto-condstore/src/infra/errors.ts)
- Add `TENANT_NOT_FOUND` to `ErrorCode` enum.
- Add user-facing message for `TENANT_NOT_FOUND` (though likely internal only).

### Repositories
#### [MODIFY] [tenant.repository.ts](file:///c:/repos/projeto-condstore/src/infra/repositories/tenant.repository.ts)
- Update `resolveTenantByTwilioNumber` to throw `BusinessError` with `ErrorCode.TENANT_NOT_FOUND` when tenant is not found (currently uses `INTERNAL_ERROR`).

### API
#### [MODIFY] [route.ts](file:///c:/repos/projeto-condstore/src/app/api/webhook/route.ts)
- **Signature Validation**: Change response for invalid/missing signature from 200 (TwiML) to 403 (JSON/Text).
- **Tenant Resolution**: Catch `TENANT_NOT_FOUND` error specifically and return 403.
- **Other Errors**: Retain 200 OK with TwiML error message to prevent Twilio infinite retries for application logic errors.

## Verification Plan

### Automated Tests
I will use the `simulate` endpoint or a simple curl/script to verify behaviors (since I cannot easily trigger real Twilio webhooks here).

1.  **Signature Rejection Test**:
    - Send POST to `/api/webhook` without `x-twilio-signature`.
    - **Expect:** HTTP 403.

2.  **Tenant Not Found Test**:
    - Mock internal `verifyRequest` to pass (or disable signature validation locally).
    - Send POST with a `To` number that doesn't exist in DB.
    - **Expect:** HTTP 403. (Currently returns 200).

3.  **Valid Flow Test** (Regression):
    - Send POST with valid `To` number.
    - **Expect:** HTTP 200.
