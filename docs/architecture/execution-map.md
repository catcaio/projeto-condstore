# Execution Map (Pre-Domine Migration)

## Synchronous Heavy Processing Flow

### Quotes
**Route:** `POST /api/public/cotacao/quotes`
**Processing:** `ConcurrentQuoteEngine` (Calls multiple carrier APIs concurrently and saves to analytics DB)
**Responsible Module:** `shipping`

### Webhooks
**Route:** `POST /api/webhook/stripe`
**Processing:** `BillingService` / Stripe lifecycle handlers (Atomic DB insertions, upgrade tenant plan, update subscriptions)
**Responsible Module:** `billing`

### FinOps Jobs
**Route:** `POST /api/internal/jobs/finops-reconciliation`
**Processing:** `runFinopsReconciliation` (Iterates over stale events, processes balances and unlocks usage)
**Responsible Module:** `jobs`

### Background Workers
**Script:** `src/workers/finops-worker.ts`
**Script:** `src/workers/knowledge-sync.ts`
**Script:** `src/workers/knowledge-ingest.ts`
**Processing:** Runs continuously processing items in the background. Currently untethered to the Domine Event Spine.
