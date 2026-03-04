# CONDSTORE OS Architecture Reference

This document outlines the core structural design, internal orchestration patterns, and security mechanisms governing the CONDSTORE OS platform. It is the definitive reference for engineers contributing to the codebase.

## 1. System Topology & Layers

The system uses a rigidly separated topology, decoupling public ingestion from internal state processing to protect the event loop and constrain the blast radius of API degradation.

```text
[ Client (Public) ]       [ Client (Tenant/Cockpit) ]       [ GitHub CI / Tools ]
         |                              |                             |
         v                              v                             | (CI Guardrails)
+-------------------+         +-------------------+                   v
|  Public Surface   |         | Tenant/Cockpit    |         [ Pre-Commit Hooks ]
|  (Auth: None)     |         | (Auth: Cookie)    |         [ Route Reg Verify ]
+-------------------+         +-------------------+         [ Env Leak Scanner ]
         |                              |                             |
         +-------------+----------------+                             |
                       |
               [ Next.js Middleware ] -> (Surface Evaluator / Rate Limiter)
                       |
         +-------------+----------------+
         |                              |
+-------------------+         +-------------------+
|  Internal Layer   |         |   Worker Layer    |
| (Auth: Tokens)    |         | (Auth: Signatures)|
+-------------------+         +-------------------+
         |                              |
         +-------------+----------------+
                       |
                 [ Data & State ]
          (TiDB / PostgreSQL / Drizzle)
               (Redis Streams/Cache)
```

## 2. Public Quotation Data Flow (Concurrent Engine)

The `/cotacao` engine is engineered for resilience against upstream logistics API failures. It abstracts individual carriers behind standardized adapters.

1. **Intention Registration:** A user visits the quote page. An anonymous session identity (`condstore_anon`) is created and tied to an `intentId`.
2. **Concurrent Fetch:** The `/api/public/cotacao/quotes` endpoint is hit. The `ConcurrentQuoteEngine` orchestrates parallel requests to multiple `CarrierAdapter` instances via `Promise.allSettled`.
3. **Timeout Gating:** Each outbound request is bound by an explicit `Promise.race` sequence (e.g., 6000ms). Any carrier exceeding this SLA falls back into a deterministic failure state without halting the overall request.
4. **Ranking & Delivery:** Returning quotes are structurally normalized and sorted across multiple calculated views (e.g., Cheapest, Fastest, Best Value).
5. **PII Sanitization & Observability:** Before returning the data, the engine strips any PII. The sanitized summary (success count, timeout count, latency) is flushed asynchronously to the Domine Operational Layer.

## 3. Domine Event Spine

Domine acts as the central event-driven orchestration spine for Condstore OS. It decouples heavy synchronous processing from the HTTP layer, transitioning the architecture into an async worker-based model.

- **Event Dispatch (Publish/Subscribe):** Edge surfaces (like Quote APIs or Stripe Webhooks) validate payloads synchronously and immediately publish standard `DomineEvent`s (e.g., `FREIGHT_QUOTE_REQUESTED`, `WEBHOOK_RECEIVED`, `FINOPS_EVENT`) to the internal event bus.
- **Async Workers:** Dedicated background processes (`quote-worker`, `webhook-worker`, `finops-worker`, `knowledge-sync`) subscribe to these events, executing heavy lifting (calculating freight, reconciling billing, syncing vectors) resiliently.
- **Frontend Compatibility:** Where synchronous HTTP responses are still required by frontends (e.g., waiting for quotes), the API layer uses `waitForEvent` with bounded timeouts to await worker completion before returning.
- **Observability:** Workers register `processed`, `failed`, and `retry` states consistently, emitting telemetry into the Domine Operational Layer.

## 4. End-to-End Governance and Protection

The system is rigorously protected against architectural decay (human error or "footguns") through synchronous validation protocols.

### Surface Map Enforcement
All internal and external networking boundaries are documented in `docs/surface-map.md`. 
- **The Proxy Guarantee:** `proxy.ts` (the Next.js middleware) dynamically implements these boundaries. It ensures that `/api/internal/**` requires standard `x-internal-token` and immediately strips spoofable client headers.

### Route Registry Guard
To prevent undocumented or accidentally public endpoints from reaching production:
1. `scripts/routes-inventory.ts` automatically maps every physical file matching Next.js App Router definitions across `src/app/**`.
2. The CI pipeline invokes `routes:verify`. If the inventory detects a route not explicitly documented in `docs/routes-registry.md`, the pipeline executes a hard fail prior to the Typecheck stage.

### Safe QA Bootstrapping
Automated E2E tests (Playwright) bypass CAPTCHA and MFA bottlenecks by invoking `/api/internal/qa/bootstrap-session`. This path is exclusively authorized by verifying the `x-qa-token` via GitHub Action environment validation, ensuring that dynamic test seeds are physically impossible to trigger via public gateways.

## 5. Security Policies

### Auth Boundary
All tenant-scoped API routes under `/api/tenants/[tenantId]/**` require authenticated sessions. Destructive operations (e.g., `DELETE /api/tenants/[tenantId]/privacy/purge-user`) additionally require `admin` role and strict tenant match via `requireAdminSession()`. The `proxy.ts` middleware strips all spoofable auth headers (`x-tenant-id`, `x-auth-*`) from incoming requests before any route handler executes.

### Public Surface Map
The following routes are explicitly **public** (no auth required): `/`, `/cotacao`, `/docs`, `/login`, `/pricing`, `/robots.txt`, `/sitemap.xml`. These are excluded from the `proxy.ts` matcher and served as static or ISR pages.

### Sensitive Routes List
Routes classified as **critical** for rate-limiting and access control:
- `/api/internal/**` — requires `x-internal-token`
- `/api/webhook/**` — requires webhook signature verification
- `/api/tenants/[tenantId]/privacy/**` — requires admin session + tenant match
- `/api/auth/**` — login/logout boundaries
- `/api/cockpit/**` — requires authenticated cookie session

### Rate-Limit Policy
The rate limiter classifies route scopes into two sensitivity levels:
- **`critical`** (default): On Redis failure, the limiter **fails closed** (blocks the request). Applies to webhook, auth, internal, ingest, and all unclassified routes.
- **`public_safe`**: On Redis failure, the limiter **fails open** (allows the request). Applies only to explicitly safe public routes (home, docs, pricing, cotacao).

