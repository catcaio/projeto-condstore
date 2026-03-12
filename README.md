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
