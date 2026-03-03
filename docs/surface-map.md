# CONDSTORE OS - Official Surface Map

This map classifies all detected routes according to zero-trust and security principles.

| Path | Surface | Auth Type | Data Sensitivity | Risk Level |
|---|---|---|---|---|
| `/` | Public | None | Public | Low |
| `/about` | Unknown | Unknown | Operational | Medium |
| `/api/app/events` | Unknown | Unknown | Operational | Medium |
| `/api/auth/login` | Unknown | Unknown | Operational | Medium |
| `/api/auth/logout` | Unknown | Unknown | Operational | Medium |
| `/api/auth/me` | Unknown | Unknown | Operational | Medium |
| `/api/auth/seed-admin` | Unknown | Unknown | Operational | Medium |
| `/api/billing/subscription` | Unknown | Unknown | Operational | Medium |
| `/api/checkout` | Unknown | Unknown | Operational | Medium |
| `/api/cockpit/analytics/events` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/analytics/summary` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/attribution/tokens` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/audit` | Cockpit | Cookie | Operational/PII | Critical |
| `/api/cockpit/billing/checkout` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/billing/upgrade` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/domine/connectors` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/domine/summary` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/finops` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/finops/alerts` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/finops/unlock` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/metrics` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/metrics/acquisition` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/metrics/acquisition/drilldown` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/metrics/freight` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/metrics/funnel` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/ops/run-rollup` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/ops/status` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/saved-views` | Cockpit | Cookie | Operational/PII | High |
| `/api/cockpit/system-status` | Cockpit | Cookie | Operational/PII | High |
| `/api/cron/cleanup` | Unknown | Unknown | Operational | Medium |
| `/api/db/migrate` | Unknown | Unknown | Operational | Medium |
| `/api/debug/tenants` | Unknown | Unknown | Operational | Medium |
| `/api/events` | Public API | None | Operational/LGPD | Medium |
| `/api/health` | Unknown | Unknown | Operational | Medium |
| `/api/history` | Unknown | Unknown | Operational | Medium |
| `/api/internal/auth/reset-admin` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/billing/reconcile-stripe` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/dev/session` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/diag` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/events/dlq` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/events/metrics` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/exports/frank-events` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/frank/apply-rollback` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/frank/gate` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/frank/metrics` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/frank/scheduler/run` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/health/ai` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/health/db` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/health/qdrant` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/health/redis` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/health/webhook` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/jobs/backfill-phone` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/jobs/cleanup-retention` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/jobs/finops-reconciliation` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/jobs/rollup-backfill` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/jobs/rollup-daily` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/ops` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/qa/bootstrap-session` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/qa/setup` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/qdrant/reindex` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/internal/rag/stats` | Internal | Internal-Token | PII/LGPD | Critical |
| `/api/knowledge/ask` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/collections` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/collections/[id]/sync` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/documents` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/documents/[id]` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/documents/[id]/mark-sensitive` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/documents/[id]/reprocess` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/upload/complete` | Unknown | Unknown | Operational | Medium |
| `/api/knowledge/upload/init` | Unknown | Unknown | Operational | Medium |
| `/api/metrics/freight` | Unknown | Unknown | Operational | Medium |
| `/api/metrics/freight/timeseries` | Unknown | Unknown | Operational | Medium |
| `/api/metrics/overview` | Unknown | Unknown | Operational | Medium |
| `/api/metrics/rate-limit` | Unknown | Unknown | Operational | Medium |
| `/api/metrics/rate-limit-alerts` | Unknown | Unknown | Operational | Medium |
| `/api/painel-logistico` | Unknown | Unknown | Operational | Medium |
| `/api/public/cotacao/intent` | Public API | None | Operational/LGPD | Medium |
| `/api/public/cotacao/quotes` | Public API | None | Operational/LGPD | Medium |
| `/api/public/events` | Public API | None | Operational/LGPD | Medium |
| `/api/reports/ingest` | Unknown | Unknown | Operational | Medium |
| `/api/reports/seed` | Unknown | Unknown | Operational | Medium |
| `/api/simulate` | Unknown | Unknown | Operational | Medium |
| `/api/supreme/ecosystem` | Unknown | Unknown | Operational | Medium |
| `/api/tenants/[tenantId]/ai-provider` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/ai-provider/rotate-key` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/audit` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/actions` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/connectors/orders/event` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/events` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/events/publish` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/freight/latest` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/orders` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/domine/orders/[orderId]` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/health` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/knowledge/sources` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/knowledge/sources/[sourceId]/ready` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/privacy/[action]` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/privacy/purge-user` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/secrets` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/secrets/rotate` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/secrets/test` | Tenant API | Cookie | PII | High |
| `/api/tenants/[tenantId]/settings` | Tenant API | Cookie | PII | High |
| `/api/webhook` | Worker/Webhook | Signature/None | Operational/LGPD | Medium |
| `/api/webhook/fallback` | Worker/Webhook | Signature/None | Operational/LGPD | Medium |
| `/api/webhook/stripe` | Worker/Webhook | Signature/None | Operational/LGPD | Critical |
| `/api/webhooks/stripe` | Worker/Webhook | Signature/None | Operational/LGPD | Critical |
| `/attribution` | Tenant UI | Cookie | Operational/PII | High |
| `/billing` | Unknown | Unknown | Operational | Medium |
| `/billing/manage` | Unknown | Unknown | Operational | Medium |
| `/billing/success` | Unknown | Unknown | Operational | Medium |
| `/cockpit` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/acquisition` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/acquisition/activation` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/acquisition/drilldown` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/analytics` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/audit` | Cockpit | Cookie | Operational/PII | Critical |
| `/cockpit/domine` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/domine/dlq` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/domine/health` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/finops/alerts` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/knowledge` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/knowledge/ask` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/knowledge/collections` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/knowledge/documents/[docId]/versions/[versionId]/chunks/[chunkId]` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/privacy` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/rate-limit` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/settings/knowledge` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/settings/security` | Cockpit | Cookie | Operational/PII | Critical |
| `/cockpit/status` | Cockpit | Cookie | Operational/PII | High |
| `/cockpit/status/audit` | Cockpit | Cookie | Operational/PII | Critical |
| `/cockpit/system-status` | Cockpit | Cookie | Operational/PII | High |
| `/concept-layer-preview` | Unknown | Unknown | Operational | Medium |
| `/cotacao` | Public | None | Public | Low |
| `/cotacao/result` | Unknown | Unknown | Operational | Medium |
| `/docs` | Public | None | Public | Low |
| `/evolution` | Unknown | Unknown | Operational | Medium |
| `/evolution/[id]` | Unknown | Unknown | Operational | Medium |
| `/evolution/roadmap` | Unknown | Unknown | Operational | Medium |
| `/freight/simulations` | Tenant UI | Cookie | Operational/PII | High |
| `/freight/simulations/[id]` | Tenant UI | Cookie | Operational/PII | High |
| `/home` | Tenant UI | Cookie | Operational/PII | High |
| `/inbox` | Tenant UI | Cookie | Operational/PII | High |
| `/inbox/conversations/[id]` | Tenant UI | Cookie | Operational/PII | High |
| `/login` | Public | None | Public | High |
| `/painel-logistico` | Unknown | Unknown | Operational | Medium |
| `/pricing` | Public | None | Public | Low |
| `/settings` | Tenant UI | Cookie | Operational/PII | High |
| `/supreme` | Unknown | Unknown | Operational | Medium |
| `/t/[token]` | Unknown | Unknown | Operational | Medium |