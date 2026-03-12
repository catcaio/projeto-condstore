# CONDSTORE OS

Multi-tenant operational system for B2B logistics — freight quoting, order management, CRM, WhatsApp automation, and AI-driven orchestration.

## Core Capabilities

| Capability | Description |
|---|---|
| **Freight Engine** | Multi-carrier quoting with table-driven pricing, packing resolution, and carrier routing |
| **Order Management** | Full lifecycle from quote confirmation to delivery with status tracking |
| **CRM** | Customer 360° with contacts, organizations, and operational history |
| **WhatsApp Automation** | AI-powered conversational commerce via Twilio WhatsApp Business API |
| **Frank AI** | Intent detection, context resolution, session state, and tool-based order orchestration |
| **Delivery Tracking** | Shipment linkage, carrier tracking, and exception detection |
| **Cockpit** | Operational dashboards with metrics, SLA monitoring, and real-time alerts |
| **Event Bus** | Asynchronous operational events with DLQ, retry, and payload sanitization |
| **Multi-Tenant** | Tenant isolation via RLS, RBAC, and session-scoped context propagation |
| **Security** | Zero-trust route guards, PII hashing/encryption, webhook signature verification |

## System Flow

```
WhatsApp message
  → Frank: intent detection (confirm_quote, track_order, etc.)
  → Frank: context resolution (customer, session, history)
  → Freight simulation (multi-carrier, table-driven)
  → Quote confirmation
  → Order creation (createOrderFromSimulation)
  → Shipment preparation (label, pickup, tracking)
  → Delivery tracking (status updates, exceptions)
  → Cockpit update (metrics, SLA, dashboards)
  → Event bus (sanitized operational events)
```

## Key Components

### Frank AI (`src/modules/frank/`)
AI agent orchestrating WhatsApp interactions. Resolves intent from messages, loads customer context and session state, executes tools (e.g., `create-order-from-quote`), and responds with operational context.

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
| `INTERNAL_DIAG_TOKEN` | Internal API authentication |
| `TWILIO_AUTH_TOKEN` | WhatsApp webhook signature verification |
| `STRIPE_SECRET_KEY` | Payment webhook verification |
| `MELHORENVIO_TOKEN` | Freight API integration |

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
