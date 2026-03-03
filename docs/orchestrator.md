# Orchestrator Layer — CONDSTORE OS

## Purpose
The Orchestrator Layer is the **central nervous system** of CONDSTORE OS. It provides a unified API for registering strategic business facts, incidents, and escalation requests across all subsystems (Public, Domine, Frank, Privacy).

All events flow through policy enforcement (source validation, tenant requirements) and LGPD-compliant payload sanitisation before persistence.

## Supported Event Types

| Type | Default Severity | Requires tenantId | Allowed Sources |
|---|---|---|---|
| `public_intent_created` | info | No | public |
| `public_quotes_generated` | info | No | public |
| `domine_event_published` | info | Yes | cockpit, domine, frank |
| `domine_event_processed` | info | Yes | domine |
| `domine_event_failed` | critical | Yes | domine |
| `frank_action_requested` | info | Yes | frank, cockpit |
| `frank_action_failed` | warning | Yes | frank |
| `privacy_purge_requested` | warning | Yes | cockpit, system |
| `privacy_purge_completed` | info | Yes | system |
| `incident_raised` | critical | No | all |
| `human_escalation_requested` | critical | No | all |

## LGPD / Redaction Policy
Every payload is deep-scanned and the following keys are **always** redacted:

`token`, `secret`, `authorization`, `cookie`, `phone`, `email`, `password`, `cpf`, `cnpj`, `apikey`, `api_key`, `creditcard`, `credit_card`

Additional per-type keys (e.g. `messageBody` for Frank events) are defined in the Event Catalog.

## Storage Strategy
- **Public events** → `public_events` table (via `publicEventsRepository`)
- **Tenant events** → `tenant_events` / audit log (via `auditService`)
- **System events without tenant** → structured log only (no DB persistence)

No new database table was introduced.

## Current Wiring Points

### A) Quotes Route (`/api/public/cotacao/quotes`)
After generating simulated quotes, a best-effort call registers `public_quotes_generated` with `intentId`, `quotesCount`, and `simulated: true`.

### B) Domine DLQ (`DomineEventsRepository.sendToDLQ`)
After marking an event as failed, a best-effort call registers an `incident_raised` with `eventId`, `reasonCode`, and `attempts`.

Both wiring points use `try/catch` — they **never** break the primary business flow.

## API

```typescript
import { registerStrategicFact, registerIncident, requestHumanEscalation } from '@/core/orchestrator/orchestrator.service';

// Register a fact
await registerStrategicFact('public_quotes_generated', { source: 'public' }, { intentId: '...' });

// Register an incident
await registerIncident({ source: 'domine', tenantId: 'T1' }, { eventId: '...' });

// Request escalation (future Telegram integration point)
await requestHumanEscalation({ source: 'system' }, { reason: '...' });
```

## Future: Telegram Escalation
The `requestHumanEscalation` function is the designated integration point for a future Telegram notification channel. When implemented, it will:
1. Persist the escalation record (already done).
2. Send a formatted message to a configured Telegram bot/channel.
3. Track delivery confirmation as a follow-up event.

**This is NOT implemented yet** — only the orchestrator entry point exists.
