# CONDSTORE OS — Architecture

**Last updated:** 2026-03-11 (post v8 audit closure)

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│  Next.js App Router (public pages, cockpit, auth flows)         │
├─────────────────────────────────────────────────────────────────┤
│                      Proxy Middleware                            │
│  Session enforcement, route matching, request tracing           │
├─────────────────────────────────────────────────────────────────┤
│                        API Routes                               │
│  /api/auth/*  /api/cockpit/*  /api/orders/*  /api/webhook/*     │
│  /api/internal/*  /api/simulate  /api/events  /api/knowledge/*  │
├─────────────────────────────────────────────────────────────────┤
│                      Domain Modules                             │
│  frank · freight · pedidos · clientes · cockpit · domine        │
│  shipping · logistica · analytics · billing · audit · privacy   │
├─────────────────────────────────────────────────────────────────┤
│                      Infrastructure                             │
│  auth · security · crypto · pii · events · db · redis · logger  │
│  circuit-breaker · rate-limit · idempotency · observability     │
├─────────────────────────────────────────────────────────────────┤
│                        Data Layer                               │
│  Drizzle ORM → TiDB/MySQL    Redis (cache, rate limit)          │
└─────────────────────────────────────────────────────────────────┘
```

### Layers

| Layer | Path | Responsibility |
|---|---|---|
| Frontend | `src/app/(public)/*`, `src/app/(cockpit)/*` | Server/client components, layouts, pages |
| Proxy | `src/proxy.ts` | Session enforcement, route classification |
| API Routes | `src/app/api/**` | HTTP handlers with guards |
| Domain Modules | `src/modules/*` | Business logic, services, repositories |
| Infrastructure | `src/infra/*` | Cross-cutting: auth, crypto, logging, caching |
| Data | `src/drizzle/schema.ts` | Schema definitions, migrations |

---

## 2. Multi-Tenant Model

Every entity is scoped by `tenantId`. Isolation is enforced at multiple layers:

1. **Session**: JWT carries `sub`, `tenantId`, `role`, `sessionVersion`
2. **Middleware**: `proxy.ts` validates session before any route handler
3. **Guards**: Route handlers call `requireSessionTenantMatch(req)` to derive tenant from session
4. **Queries**: All database queries filter by `tenantId` (application-level RLS)
5. **API payloads**: `tenantId` is never accepted from request bodies — always derived from session

### Context Propagation

```
Request → proxy.ts (validate session)
        → route handler (requireSessionTenantMatch)
        → { tenantId, userId, role } extracted
        → passed to services/repositories
        → all DB queries scoped by tenantId
```

---

## 3. Domain Modules

### CRM e Atendimento (`src/modules/clientes/` & `src/modules/atendimento/`)
Central unificada para organização de clientes e conversas (WhatsApp).
- `customer.repository.ts` — Contatos com PII encryption (AES-256-GCM) e phone_last4.
- `conversation.service.ts` — Lifecycle completo: Inbox, atribuição de operador, mensagens Bidirecionais Twilio, e evolução no **Pipeline Kanban**.
- `pipeline-metric.service.ts` — Win Rate, Oportunidades Ganhas/Perdidas.

### Orders (`src/modules/pedidos/` & `/app/(app)/cockpit/orders/`)
Full order lifecycle and Kanban fulfillment representation:
- `order.service.ts` — Transforma *Freight Quotes* em *Orders* e avança a Timeline.
- Integrado ao Kanban de Ops (CREATED → CONFIRMED → SCHEDULED → DELIVERED).
- **Shipment Engine**: Acoplado a tabela `shipments` contendo tracking logístico gerado atomicamente ao confirmar pedidos.

### Freight (`src/modules/freight/`)
Multi-carrier quote engine:
- `quote-engine.ts` — orchestrates multi-carrier simulation via `Promise.allSettled`
- `carrier-router.ts` — selects carriers based on zone and priority rules
- `table-driven-adapter.ts` — custom freight table pricing (Movvi, Mengue, Braspress)
- `packing-resolver.ts` — cubage and charged weight calculation
- `freight.service.ts` / `freight.controller.ts` — HTTP-layer orchestration
- `adapters/` — carrier-specific adapters (Melhor Envio, custom tables)
- `shipment-linkage.repository.ts` — connects orders to shipments

### Frank AI (`src/modules/frank/`)
AI operational agent for WhatsApp automation:
- `intent-resolver.ts` — detects intents (`confirm_quote`, `track_order`, etc.) with confidence scoring
- `context-resolver.ts` — loads customer, session, and operational context
- `session.repository.ts` — persistent conversation state per WhatsApp session
- `whatsapp-orchestrator.ts` — main orchestration loop (message → intent → context → tool → response)
- `tools/create-order-from-quote.tool.ts` — converts freight quotes into orders
- `cep-extractor.ts` — extracts postal codes from messages
- `product-resolver.ts` — resolves product references

### DOMINE Event Bus (`src/modules/domine/`)
Asynchronous operational event engine:
- Webhook intake for external events
- Processor loop with retry and DLQ
- Event payload contracts with PII sanitization
- Read model generation for dashboards

### Cockpit (`src/modules/cockpit/`)
Operational dashboard aggregating data from all domains. Analytics, attribution, audit, finops, and system status.

### Shipping (`src/modules/shipping/`)
Shipment preparation, label generation, and carrier dispatch.

### Logística (`src/modules/logistica/`)
Logistics operations UI: shipments view, freight table management, simulator, tracking.

### Other Modules

| Module | Purpose |
|---|---|
| `analytics` | Event analytics and aggregation |
| `audit` | Audit trail and compliance logging |
| `auth` | Authentication flows (email, Google OAuth) |
| `billing` | Subscription and checkout (Stripe) |
| `conversas` | WhatsApp conversation management |
| `cotacao-publica` | Public freight quotation engine |
| `finops` | Financial operations and cost tracking |
| `funnel` | Acquisition funnel tracking |
| `jobs` | Background jobs (cleanup, backfill) |
| `knowledge` | Knowledge base for AI/RAG |
| `metrics` | Operational metrics and retention |
| `navigation` | UI navigation configuration |
| `privacy` | LGPD compliance utilities |
| `system-status` | System health monitoring |
| `workspace` | Workspace/tenant configuration |

---

## 4. Frank AI Architecture (Runtime Congelado)

> **Status: Infraestrutura ativa (Playbooks, Supremo), mas Inferência Autônoma Congelada para focar o controle na mão do Agente Humano via Cockpit.**

```
WhatsApp Message (via Twilio webhook)
  │
  ├─ Intent Resolver (Validation Pass)
  │   - Detects intent but defers to Human Inbox queue
  │
  ├─ Context Resolver
  │   - Loads customer from phone hash
  │   - Matches session state parameters
  │
  ├─ Supreme Governance & Playbooks
  │   - /knowledge index ready for RAG operations
  │   - Access-control matrix built-in
  │
  └─ Operator Override (Current Workflow)
      - The Operator reads the structured intent on the Inbox
      - Operator pushes Quotes, updates CRM Pipeline, generates Logistical Order
```

### Tool Model

Frank uses a tool-based execution model. Each tool is a standalone function that:
1. Receives structured inputs (tenantId, simulationId, customerId, etc.)
2. Calls domain services (not databases directly)
3. Returns a typed result
4. Is registered in the orchestrator

---

## 5. Operational Event Bus

The event bus (`src/infra/events/` + `src/modules/domine/`) provides:

- **Event Emission**: Domain modules emit sanitized events (e.g., `order_created`, `freight_quoted`)
- **PII Sanitization**: Automatic redaction of `phone`, `email`, `address`, `cpf`, `rawPhone`, `rawEmail` before persistence
- **Async Processing**: Events are ingested and processed asynchronously
- **DLQ**: Failed events go to dead-letter queue for inspection and retry
- **Audit Trail**: Every event includes timestamp, tenant, actor, and context

---

## 6. Security Model

### Route Protection

All 115+ API routes use one of these guards:

| Guard | Purpose |
|---|---|
| `requireSessionTenantMatch` | Standard authenticated routes |
| `requireAdmin` | Admin-only cockpit routes |
| `requireInternalAuth` / `requireInternalToken` | Internal/service routes |
| `requireActivePlan` | Plan-gated features |
| `requireKnowledgePermission` | Knowledge base access |
| `getSessionUser` | Session-based auth |
| `assertDevOnly` | Development-only routes |
| Signature verification | Webhooks (Stripe, Twilio, HMAC) |

### Proxy Middleware (`src/proxy.ts`)

- Matches protected route patterns (`/api/cockpit/*`, `/api/orders/*`, etc.)
- Validates session cookie before handler execution
- Injects `x-request-id` for tracing
- Redirects unauthenticated UI requests to `/login`

### PII Protection

| Technique | Implementation |
|---|---|
| Phone hashing | SHA-256 with tenant-specific HMAC salt |
| Phone encryption | AES-256-GCM via `PII_ENCRYPTION_KEY` |
| Phone display | `phone_last4` only |
| Log redaction | Structured logger strips sensitive fields |
| Event sanitization | Event bus auto-redacts PII before persistence |
| Sentry | `sendDefaultPii=false`, `beforeSend` redaction |

### Webhook Hardening

- Stripe: `stripe.webhooks.constructEvent` signature verification
- Twilio: `verifyTwilioSignature` header validation
- DOMINE intake: HMAC-SHA256 signature verification
- Deduplication and idempotency on all webhook handlers

---

## 7. Data Model Overview

### Canonical Entities

| Table | Domain | Purpose |
|---|---|---|
| `users` | Auth | User accounts with session versioning |
| `tenants` | Multi-tenant | Organization/workspace isolation |
| `customers` | CRM | Customer profiles (phone_hash, phone_last4) |
| `customer_contacts` | CRM | Contact details (encrypted) |
| `orders` | Orders | Order header with status and tenant scope |
| `order_items` | Orders | Line items per order |
| `order_status_history` | Orders | Status transition timeline |
| `freight_simulations` | Freight | Multi-carrier quote results |
| `freight_shipments` | Freight | Shipment records linked to orders |
| `deliveries` | Delivery | Delivery tracking and status |
| `operational_events` | Events | Sanitized operational event log |
| `messages` | Conversations | WhatsApp messages (PII encrypted) |
| `freight_funnel_events` | Analytics | Acquisition funnel tracking |
| `frank_session_state` | Frank | Conversational session persistence |
| `security_incidents` | Security | Anomaly detection incidents |
| `carrier_policies` | Freight | Normalized carrier configuration |
| `carrier_zones` | Freight | Zone definitions for routing |
| `carrier_rate_rows` | Freight | Table-driven pricing rows |
| `webhook_events` | Webhooks | Deduplication and idempotency log |

---

## 8. CI / Quality Gates

GitHub Actions pipeline enforces:

```
npm run typecheck        → TypeScript strict compilation (0 errors required)
npm run lint             → ESLint rules
npm run test:ci          → Vitest unit/integration tests
npm run build            → Next.js production build
routes:verify-security   → All routes registered in docs/routes-registry.md
schema verification      → Drizzle schema integrity
```

### Quality Gate Philosophy

- **Fail-closed**: Missing secrets block boot in production
- **Route registry**: Unregistered routes block CI
- **PII enforcement**: Encryption key required at runtime in production
- **Rate limiting**: Fails closed without Redis in production

---

## 9. Observability

### Logging
- Structured JSON logging via `src/infra/logger.ts` and `src/infra/log/logger.ts`
- Automatic PII redaction (phone, email, token, cookie, password, body)
- Request ID propagation via `x-request-id` header

### Tracing
- `src/infra/http/request-trace.ts` — request ID generation and propagation
- Sentry integration (optional, via `SENTRY_DSN`) with PII-safe breadcrumbs
- `tenantId` and `requestId` attached as tags

### Diagnostics
- `GET /api/internal/diag` — runtime health check (DB, Redis, env, git SHA)
- Circuit breaker states (`src/infra/circuit-breaker.ts`)
- System status module (`src/modules/system-status/`)

### Metrics
- Operational metrics aggregated in cockpit dashboards
- Quote durations, carrier fail rates, SLA tracking
- Retention cleanup with configurable policies per table
