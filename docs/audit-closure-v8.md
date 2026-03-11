# Audit Closure v8 — CONDSTORE OS

**Date**: 2026-03-11
**Baseline commit**: `ad564f8` (security hardening v8)
**Closure commit**: See latest `main`

---

## Findings Closed

### Route Protection (P0) ✅
- **115 API routes** audited — all use approved auth guards
- Guard patterns found: `requireSessionTenantMatch`, `requireInternalAuth`, `requireInternalToken`, `requireAdmin`, `requireActivePlan`, `requireKnowledgePermission`, `getSessionUser`, `assertDevOnly`, HMAC/Stripe/Twilio signature verification
- `/api/orders/*` added to `proxy.ts` middleware matcher + session guard
- `POST /api/orders/create-from-quote` hardened with `requireInternalAuth`; `tenantId` removed from request body

### PII Logging (P1) ✅
| File | Issue | Fix |
|------|-------|-----|
| `internal/qa/bootstrap-session/route.ts` | Logged `email` in plaintext (×2) | Removed email from log payloads |
| `internal/dev/session/route.ts` | Logged `email` in plaintext | Removed email from log payload |
| `scripts/smoke-metrics.ts` | Logged phone number in plaintext | Replaced with generic label |

### PII Persistence (P0) ✅
- `customer.repository.ts` — `hashPhone()` (SHA-256) and `phoneLast4()` helpers added
- Email encryption infrastructure already in place via `infra/pii/crypto.ts` (`encryptString`/`decryptString`)
- No raw phone/email/cpf/address found in any DB insert path

### Event Bus Sanitization (P1) ✅
- `operational-event-bus.ts` — automatic PII sanitizer strips `phone`, `email`, `address`, `cpf`, `rawPhone`, `rawEmail` → `[REDACTED]` before persistence

### Proxy Middleware Coverage (P0) ✅
Covered routes in `proxy.ts` matcher:
- `/cockpit/*`, `/dashboard/*`, `/operacao/*`, `/conversas/*`, `/clientes/*`, `/pedidos/*`
- `/logistica/*`, `/frank/*`, `/metricas/*`, `/tenant/*`, `/configuracoes/*`
- `/vendas/*`, `/financeiro/*`, `/sistema/*`, `/supreme/*`, `/home/*`, `/inbox/*`
- `/freight/simulations/*`, `/attribution/*`, `/settings/*`
- `/api/internal/*`, `/api/cockpit/*`, `/api/tenants/*`, `/api/admin/*`, `/api/orders/*`, `/api/public/*`

---

## Files Changed

| File | Action |
|------|--------|
| `src/proxy.ts` | Added `/api/orders` to matcher + session guard |
| `src/app/api/orders/create-from-quote/route.ts` | Added `requireInternalAuth`, removed tenantId from body |
| `src/modules/clientes/customer.repository.ts` | Added `hashPhone`, `phoneLast4` |
| `src/lib/events/operational-event-bus.ts` | Added PII sanitizer |
| `src/app/api/internal/qa/bootstrap-session/route.ts` | Removed email from logs |
| `src/app/api/internal/dev/session/route.ts` | Removed email from log |
| `src/scripts/smoke-metrics.ts` | Redacted phone from log |

---

## Accepted Risks

| Risk | Rationale |
|------|-----------|
| Dev seed script (`0003_seed_dev_user.ts`) logs email | Only executes manually in dev; blocked in CI/prod |
| `phone.ts` PII helper warns about missing key | Dev/test fallback warning; not a PII leak |
| `smoke-metrics.ts` uses hardcoded test phone internally | Phone used only in-process for DB filter; log output now redacted |

---

## Audit Status: **CLEARED** ✅

All P0 and P1 findings have been resolved. No remaining open items.
