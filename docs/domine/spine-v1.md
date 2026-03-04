# Domine Spine V1 — Contract + Intake (LOJACOND Only)

> **Status:** Active  
> **Scope:** LOJACOND tenant only (feature flag: `isDomineEnabled()`)

## 1. Event Contract

All Domine events follow the normalized contract defined in `src/domine/contracts/event.ts`:

```typescript
{
  id:            string    // UUID v4
  tenantId:      string    // e.g. "LOJACOND"
  type:          string    // event type (see below)
  source:        enum      // cockpit | webhook | connector | frank | http_api | internal
  payload:       unknown   // arbitrary JSON — never logged raw
  status:        enum      // queued | processing | done | failed | dlq
  retryCount:    number    // 0-based
  nextRetryAt:   Date?     // null until first retry
  createdAt:     Date
  updatedAt:     Date?
}
```

### Event Types (V1 Minimum)

| Type | Description |
|------|-------------|
| `FREIGHT_QUOTE_REQUESTED` | Freight quotation request |
| `WEBHOOK_RECEIVED` | External webhook payload |
| `KNOWLEDGE_SYNC_REQUESTED` | Knowledge base sync trigger |
| `FINOPS_EVENT` | Financial operations event |

All inputs are validated via **Zod** (`PublishInputSchema`).

## 2. Intake Flow

```
caller → POST /api/tenants/{tenantId}/domine/events/publish
       → DomineIntakeService.publish()
       → Zod validation
       → isDomineEnabled(tenantId) guard  ← rejects non-LOJACOND
       → domineEventsRepository.publish() ← persists to domine_events table
       → structuredLogger (no PII in logs)
       → return { id, inserted }
```

- **Idempotency:** UNIQUE constraint on `(tenantId, idempotencyKey)`. If `idempotencyKey` is omitted, a random UUID is generated.
- **PII Safety:** Logs only `{ eventId, tenantId, type, source }` — never raw payload.
- **Auth:** Admin session required + tenant match enforced at route level.

## 3. Event States

```
queued → processing → done
                   ↘ failed → dlq
```

| Status | Description |
|--------|-------------|
| `queued` | Persisted, waiting to be picked up |
| `processing` | Currently being handled by a worker |
| `done` | Successfully processed |
| `failed` | Processing failed (may retry) |
| `dlq` | Dead-letter queue — exceeded retries |

## 4. API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/tenants/{tid}/domine/events/publish` | Admin + tenant match | Publish new event |
| GET | `/api/tenants/{tid}/domine/events` | Admin + tenant match | Paginated event list |
| GET | `/api/tenants/{tid}/domine/events/{id}` | Admin + tenant match | Event detail (payload redacted) |

## 5. Security

- **Zero-trust:** `tenantId` always derived from session — never from headers.
- **LOJACOND only:** `isDomineEnabled()` rejects all other tenants.
- **PII redaction:** Detail endpoint strips `email`, `telefone`, `cpf`, `cnpj`, `password`, etc. from payload before returning.
