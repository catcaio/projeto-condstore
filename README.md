# CONDSTORE OS

Multi-tenant B2B operational system focusing on **Assisted Wholesale CRM and Logistics**. It binds human-driven WhatsApp conversations, CRM Pipeline, multi-carrier freight quoting, and order orchestration inside a unified command center (Cockpit).

> **Note**: For a detailed view of live versus frozen capabilities, refer to [Current Product State](docs/current-product-state.md).

## Core Capabilities

| Capability | Description |
|---|---|
| **Human Atendimento (Inbox)** | Real-time Twilio WhatsApp Business integration with operator interface and multi-tenant isolation |
| **Pipeline CRM** | Visual Kanban for sales stages (New → Quoted → Won) linked natively to chat sessions |
| **Freight Engine** | Multi-carrier quoting injected directly on the chat UX (Movvi, Mengue, Braspress tables + Melhor Envio) |
| **Order Management** | Convert approved quotes into operational Orders seamlessly via the CRM interface |
| **Delivery Tracking** | Logistical Shipments generated synchronously upon Order confirmation, attaching trackable endpoints |
| **Frank AI** | Intent detection, context resolution, session state, and tool-based order orchestration |
| **Delivery Tracking** | Shipment linkage, carrier tracking, and exception detection |
| **Cockpit** | Operational dashboards with metrics, SLA monitoring, and real-time alerts |
| **Event Bus** | Asynchronous operational events (DOMINE Engine) with DLQ, retry, and PII-sanitized telemetry |
| **Multi-Tenant** | Native isolation via application RLS, session validation, and JWT payload strictly enforced |
| **AI Infrastructure (Frozen)** | Backend readiness for Playbooks & Knowledge RAG — fully structured, runtime frozen for operational determinism |

## System Flow (Human-driven CRM + Logistics Lifecycle)

```
WhatsApp message from End-Customer
  → Inbox Chat (Cockpit Human Atendimento)
  → Sales Rep operates on CRM Pipeline Stage
  → Freight simulation directly attached to conversation
  → Operator sends Quote URL directly to chat
  → Quote approval (Customer)
  → Click "Criar Pedido" transforms Deal to WON and spawns Logistics Order (CREATED)
  → Order transitions to CONFIRMED spawning Shipment Engine integrations
  → Delivery Tracking (Tracking links directly tied back to CRM sidebar view)
  → Event Bus processes conversion and calculates dashboard metrics
```

## Key Components

### Human CRM & Cockpit (`src/modules/clientes/` & `src/app/.../cockpit/atendimento/`)
Customer organization, pipeline generation, unified multi-tenant inbox for answering prospects, escalating opportunities, and injecting operational orders directly inside the sales environment.

### Frank AI (`src/modules/frank/` - Runtime Frozen)
Advanced intent detection and RAG intelligence architecture built for automation, currently frozen on deterministic commands in favor of operator precision in wholesale logistics.

### Freight Engine (`src/modules/freight/`)
Multi-carrier quote engine with table-driven adapters, packing resolution, carrier routing, and shipment linkage. Supports Melhor Envio API and custom freight tables (Movvi, Mengue, Braspress).

### Orders (`src/modules/pedidos/`)
Order lifecycle management: creation from freight quotes, status tracking, item management, and event timeline.

### CRM (`src/modules/clientes/`)
Customer and organization management with contact normalization, phone hashing (SHA-256), and encrypted PII storage.

### Cockpit (`src/modules/cockpit/`)
Operational dashboard aggregating metrics, analytics, attribution, and system health across all domains.

### DOMINE Event Bus (`src/modules/domine/`)
Asynchronous event engine with webhook intake, processor loop, DLQ management, and event payload contracts.

### Supreme Engine (`src/modules/frank/` + cockpit governance)
AI governance layer controlling permissions, findings, playbooks, and operational boundaries for Frank.

## Security

- **Route Guards**: All 115+ API routes protected by `requireAdmin`, `requireSessionTenantMatch`, `requireInternalAuth`, `requireActivePlan`, or signature verification
- **Proxy Middleware** (`src/proxy.ts`): Session enforcement for cockpit and API routes
- **PII Protection**: Phone hashing (SHA-256), AES-256-GCM encryption, event payload sanitization
- **Webhook Hardening**: Stripe/Twilio signature verification, deduplication, idempotency
- **RBAC**: Role-based access (admin, operator, viewer) with tenant-scoped context
- **Audit Trail**: Complete event logging with timestamp, author, and context
- **CI Quality Gates**: Typecheck, lint, tests, build, schema verification, route registry guardrails

## Development Setup

```bash
# Install dependencies
npm install

# Environment variables (create .env.local)
DATABASE_URL=mysql://...
REDIS_URL=redis://...
AUTH_SECRET=...
PII_ENCRYPTION_KEY=...

# Run dev server
npm run dev

# Type checking
npm run typecheck

# Production build
npm run build

# Tests
npm run test:ci
```

### Required Environment Variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | TiDB/MySQL connection (lazy-initialized) |
| `AUTH_SECRET` | JWT session signing |
| `PII_ENCRYPTION_KEY` | AES-256-GCM key for PII encryption |
| `REDIS_URL` | Cache, rate limiting, session support |
| `INTERNAL_DIAG_TOKEN` | Official token for diagnostics/health endpoints |
| `INTERNAL_EXPORT_TOKEN` | Official token for export/read-only internal flows |
| `INTERNAL_JOB_TOKEN` | Official token for jobs/cron/internal workers |
| `INTERNAL_TOKEN` | Legacy alias accepted only for `jobs` routes |
| `QA_BOOTSTRAP_TOKEN` | QA bootstrap token for `/api/internal/qa/*` |
| `BOOTSTRAP_TOKEN` | Extra bootstrap header required only by guarded bootstrap flows |
| `TWILIO_AUTH_TOKEN` | WhatsApp webhook signature verification |
| `STRIPE_SECRET_KEY` | Payment webhook verification |
| `MELHORENVIO_TOKEN` | Freight API integration |


### Internal Auth Contract

> Este contrato centralizado cobre **tokens internos por propósito**. Ele não redefine toda a política global de config/auth do sistema.

**Official env names**
- `INTERNAL_DIAG_TOKEN` → propósito `diag`.
- `INTERNAL_EXPORT_TOKEN` → propósito `export`.
- `INTERNAL_JOB_TOKEN` → propósito `jobs`.
- `QA_BOOTSTRAP_TOKEN` → propósito `qa_bootstrap` para `/api/internal/qa/*`.
- `BOOTSTRAP_TOKEN` → segundo fator adicional apenas para fluxos que chamam `requireInternalAuth(..., { requireBootstrapToken: true })`.

**Legacy aliases**
- `INTERNAL_TOKEN` é legado e continua aceito somente para propósito `jobs`.
- Header `x-qa-bootstrap` continua aceito como alias legado de `x-qa-token`.

**Usage rules by purpose**
- Middleware e guards compartilham o mesmo contrato: `x-internal-token`/`?token=` para `diag`, `export` e `jobs`; `x-qa-token` (ou alias legado `x-qa-bootstrap`) para `qa_bootstrap`.
- Em runtimes strict (`NODE_ENV=production`, `VERCEL_ENV=preview|production` ou `APP_ENV=staging`), a aplicação falha cedo se `INTERNAL_DIAG_TOKEN`, `INTERNAL_EXPORT_TOKEN` ou `INTERNAL_JOB_TOKEN` não estiverem configurados.
- Em desenvolvimento, o fallback efêmero continua restrito ao par `diag/export` e não mascara o comportamento de staging/produção.
- `/api/internal/*` permanece fail-closed sem token mesmo em desenvolvimento; o que continua flexível em dev é apenas o fallback efêmero usado por fluxos server-side de `diag/export`.
- A política atual de `AUTH_SECRET` não mudou nesta PR: ele continua obrigatório em runtimes strict, enquanto o fallback local de `src/infra/auth/session.ts` segue preservado fora deles.

## Deployment

- **Platform**: Vercel (Production + Preview) with Turbopack builds
- **Database**: TiDB (MySQL-compatible) with Drizzle ORM
- **CI Pipeline**: GitHub Actions running typecheck → lint → tests → build → schema verification → route registry verification
- **Quality Gate Philosophy**: Fail-closed. Missing secrets block boot in production. Rate limiter fails closed without Redis. Unregistered routes block CI.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript (strict)
- **ORM**: Drizzle ORM
- **Database**: TiDB/MySQL
- **Cache**: Redis
- **Tests**: Vitest
- **Hosting**: Vercel
- **WhatsApp**: Twilio Business API
- **Payments**: Stripe
- **Freight**: Melhor Envio API + custom table adapters

## WhatsApp supervised operational flow

- Inbound WhatsApp now resolves customer identity by normalized phone and flags unidentified conversations for operator triage.
- Supervised suggestions can include catalog product lookup and freight quote draft (when product + quantity + CEP are present), always requiring human approval before outbound send.
- Scenario validation script: `node --import tsx scripts/test-whatsapp-scenarios.ts`.
