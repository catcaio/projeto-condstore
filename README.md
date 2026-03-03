# CONDSTORE OS

## Overview

CONDSTORE OS is a multi-tenant logistics and orchestration platform designed for high availability and strict data governance. The system acts as the operational spine for tenants, providing a public multi-carrier quotation engine, an internal operational layer (Domine), a centralized administrative Cockpit, and structural governance mechanisms to enforce Zero-Trust and CI guardrails at scale. 

The architecture guarantees isolation via RLS (Row-Level Security) by `tenantId`, enforces explicit surface mapping for all endpoints, and ensures predictability across development lifecycles.

## Architecture Layers

The platform is explicitly decoupled into four distinct network and authorization surfaces:

1. **Public Layer**
   - **Scope:** Marketing endpoints, authentication boundaries, and the public quotation engine (`/cotacao`).
   - **Characteristics:** Highly cacheable, rate-limited via Redis, completely asynchronous. The quotation engine is fully concurrent (executing multi-carrier adapters via `Promise.allSettled`) with strict failover timeouts, preventing third-party latency from degrading the user experience.
   - **Authentication:** `None` (or anonymous session drops).

2. **Cockpit Layer**
   - **Scope:** The unified administrative interface for internal operations and tenant administration (`/cockpit/**`).
   - **Characteristics:** Consolidates analytics, telemetry, routing audits, and knowledge management into a single, cohesive dashboard pattern.
   - **Authentication:** Strict `Cookie` enforcement tied to validated Next.js sessions.

3. **Internal API Layer**
   - **Scope:** Protected diagnostic, backfill, and orchestration endpoints (`/api/internal/**`).
   - **Characteristics:** Provides deterministic access for infrastructure tasks (e.g., QA bootstrap sessions, diagnostic probes, and synchronous structural verifications). 
   - **Authentication:** Exclusively requires `Internal-Token` (e.g., `x-internal-token`). These routes bypass standard browser-based cookie evaluation, aggressively blocking non-service invocations.

4. **Worker / Processing Layer**
   - **Scope:** Background tasks, DLQ (Dead Letter Queue) processing, FinOps reconciliation, and Webhook ingestion (`/api/webhook/**`).
   - **Characteristics:** Decoupled from the Edge API. Responsible for non-blocking I/O operations and third-party callback verifications.
   - **Authentication:** Webhook signatures (e.g., Stripe) or internal tokens.

## Security Model

Security in CONDSTORE OS is anchored on Zero-Trust principles and explicit governance:
- **Zero-Trust & Surface Classification:** Every route is classified in an official `docs/surface-map.md`. The Next.js `middleware` (via `proxy.ts`) dynamically evaluates the surface layer of an incoming request and enforces the expected authentication mechanism before any rendering lifecycle begins. 
- **Token Enforcement:** Internal surface routes are hard-gated against browser-accessible cookies and demand explicit backend-to-backend infrastructure tokens.
- **LGPD Enforcement & PII Protection:** The multi-carrier quote responses and internal event payloads undergo systemic sanitization. Personally Identifiable Information (PII) is structurally excluded from operational telemetry, logs, and public responses.

## Operational Model

- **Events (The Domine Layer):** The platform utilizes a minimal operational layer known as Domine. When edge activities occur (e.g., a multi-carrier quote completes or a carrier times out), sanitized domain events (`quote_completed`, `carrier_failed`) are ingested asynchronously.
- **DLQ (Dead Letter Queues):** Failed background logic and unprocessable orchestrations fallback into dedicated DLQs managed within the Cockpit API for safe inspection and retry.
- **SLA Monitoring & Observability:** Quote durations and carrier fail rates are persistently tracked. SLIs (Service Level Indicators) trigger lightweight warnings and Strategic Facts automatically when a threshold is breached, ensuring degradation is visible directly within the Cockpit without requiring external APM sweeps.

## Development & CI

The platform enforces strict safety guardrails directly integrated into the local development workflow and the GitHub Actions CI/CD pipeline:
- **Route Registry Guard:** All active application routes are cross-verified against a static inventory (`docs/routes-registry.md`). Unregistered routes explicitly block the CI Typecheck phase (`routes:verify`).
- **Surface Verification:** Anti-footgun gates parse the surface map during pre-commit/CI builds, preventing structural regressions (e.g., exposing a public endpoint without a rate-limit wrapper or omitting a required token guard on an internal API).
- **Env Leak Detection:** Heuristic scanners prevent the commit tracking of sensitive credentials and payload signatures.
- **QA Bootstrap Control:** A hermetic and deterministic login mechanism is enabled via isolated `/api/internal/qa/*` routes solely for automated UI regression tests, fully locked down by specialized pipeline secrets.

## Deployment

- **Environments:** Vercel (Production & Preview edges), utilizing Turbopack builds and Edge Runtime for the public routing layer. 
- **Required ENV Variables:** Database connectivity (`DATABASE_URL`), core message broker (`REDIS_URL`), cryptographic verification limits (`AUTH_SECRET`), and operational layer keys (e.g., `INTERNAL_JOB_TOKEN`, `QA_BOOTSTRAP_TOKEN`).
- **Safe Boot Behavior:** The application gracefully bypasses internal token injection on specific public surfaces if initialization variables reflect an intermediate PR preview phase, avoiding deadlocks in non-critical pipeline reviews.

## Roadmap

- **Multi-Carrier Expansion:** Standardization of a unified adapter protocol to seamlessly append and simulate regional logistics providers.
- **Advanced Domine Intelligence:** Transitioning Domine from a lightweight operational read-model towards a proactive orchestration mesh capable of automatically shifting quote load based on predictive timeout matrices.
- **Tenant-Specific Orchestration:** Deepening the isolation to allow tenant-overridden carrier rules and custom FinOps gating prior to external fulfillment logic execution.
