# RBAC Audit Report

| Route | Guards | Status |
|---|---|---|
| app/events/route.ts | NONE | NO_GUARD |
| auth/login/route.ts | INTERNAL_TOKEN | OK |
| auth/logout/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| auth/me/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| auth/seed-admin/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| billing/subscription/route.ts | NONE | NO_GUARD |
| checkout/route.ts | NONE | NO_GUARD |
| cockpit/analytics/events/route.ts | requireAdmin | OK |
| cockpit/analytics/summary/route.ts | requireAdmin | OK |
| cockpit/attribution/tokens/route.ts | requireAdmin | OK |
| cockpit/audit/route.ts | requireAdmin | OK |
| cockpit/billing/checkout/route.ts | requireAdmin | OK |
| cockpit/billing/upgrade/route.ts | requireAdmin | OK |
| cockpit/domine/connectors/route.ts | NONE | COCKPIT_WITHOUT_ADMIN |
| cockpit/domine/summary/route.ts | NONE | COCKPIT_WITHOUT_ADMIN |
| cockpit/finops/alerts/route.ts | requireAdmin | OK |
| cockpit/finops/route.ts | requireAdmin | OK |
| cockpit/finops/unlock/route.ts | requireAdmin | OK |
| cockpit/metrics/acquisition/drilldown/route.ts | requireAdmin | OK |
| cockpit/metrics/acquisition/route.ts | requireAdmin | OK |
| cockpit/metrics/freight/route.ts | requireAdmin | OK |
| cockpit/metrics/funnel/route.ts | requireAdmin | OK |
| cockpit/metrics/route.ts | requireAdmin | OK |
| cockpit/ops/run-rollup/route.ts | requireAdmin | OK |
| cockpit/ops/status/route.ts | requireAdmin | OK |
| cockpit/saved-views/route.ts | requireAdmin | OK |
| cockpit/system-status/route.ts | NONE | COCKPIT_WITHOUT_ADMIN |
| cron/cleanup/route.ts | NONE | NO_GUARD |
| db/migrate/route.ts | isInternalTokenAuthorized | OK |
| debug/tenants/route.ts | NONE | NO_GUARD |
| events/route.ts | NONE | NO_GUARD |
| health/route.ts | NONE | NO_GUARD |
| history/route.ts | NONE | NO_GUARD |
| internal/auth/reset-admin/route.ts | isInternalTokenAuthorized | OK |
| internal/billing/reconcile-stripe/route.ts | isInternalTokenAuthorized | OK |
| internal/dev/session/route.ts | INTERNAL_TOKEN | OK |
| internal/diag/route.ts | isInternalTokenAuthorized | OK |
| internal/events/dlq/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/events/metrics/route.ts | isInternalTokenAuthorized | OK |
| internal/exports/frank-events/route.ts | isInternalTokenAuthorized | OK |
| internal/frank/apply-rollback/route.ts | isInternalTokenAuthorized | OK |
| internal/frank/gate/route.ts | isInternalTokenAuthorized | OK |
| internal/frank/metrics/route.ts | isInternalTokenAuthorized | OK |
| internal/frank/scheduler/run/route.ts | isInternalTokenAuthorized | OK |
| internal/health/ai/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/health/db/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/health/qdrant/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/health/redis/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/health/webhook/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/jobs/backfill-phone/route.ts | isInternalTokenAuthorized | OK |
| internal/jobs/cleanup-retention/route.ts | isInternalTokenAuthorized | OK |
| internal/jobs/finops-reconciliation/route.ts | isInternalTokenAuthorized | OK |
| internal/jobs/rollup-backfill/route.ts | isInternalTokenAuthorized | OK |
| internal/jobs/rollup-daily/route.ts | isInternalTokenAuthorized | OK |
| internal/ops/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| internal/qa/bootstrap-session/route.ts | INTERNAL_TOKEN | OK |
| internal/qdrant/reindex/route.ts | isInternalTokenAuthorized | OK |
| internal/rag/stats/route.ts | NONE | INTERNAL_WITHOUT_TOKEN |
| knowledge/ask/route.ts | NONE | NO_GUARD |
| knowledge/collections/route.ts | NONE | NO_GUARD |
| knowledge/collections/[id]/sync/route.ts | NONE | NO_GUARD |
| knowledge/documents/route.ts | NONE | NO_GUARD |
| knowledge/documents/[id]/mark-sensitive/route.ts | NONE | NO_GUARD |
| knowledge/documents/[id]/reprocess/route.ts | NONE | NO_GUARD |
| knowledge/documents/[id]/route.ts | NONE | NO_GUARD |
| knowledge/upload/complete/route.ts | NONE | NO_GUARD |
| knowledge/upload/init/route.ts | NONE | NO_GUARD |
| metrics/freight/route.ts | NONE | NO_GUARD |
| metrics/freight/timeseries/route.ts | NONE | NO_GUARD |
| metrics/overview/route.ts | NONE | NO_GUARD |
| metrics/rate-limit/route.ts | NONE | NO_GUARD |
| metrics/rate-limit-alerts/route.ts | NONE | NO_GUARD |
| painel-logistico/route.ts | isInternalTokenAuthorized | OK |
| public/events/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| reports/ingest/route.ts | NONE | NO_GUARD |
| reports/seed/route.ts | NONE | NO_GUARD |
| simulate/route.ts | NONE | NO_GUARD |
| supreme/ecosystem/route.ts | isInternalTokenAuthorized | OK |
| tenants/[tenantId]/ai-provider/rotate-key/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/ai-provider/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/audit/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/actions/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/connectors/orders/event/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/events/publish/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/events/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/freight/latest/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/orders/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/domine/orders/[orderId]/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/health/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/knowledge/sources/route.ts | requireAdmin | OK |
| tenants/[tenantId]/knowledge/sources/[sourceId]/ready/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/secrets/rotate/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/secrets/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/secrets/test/route.ts | requireSessionTenantMatch | OK |
| tenants/[tenantId]/settings/route.ts | requireSessionTenantMatch | OK |
| webhook/fallback/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| webhook/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| webhook/stripe/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
| webhooks/stripe/route.ts | NONE | NO_GUARD (EXPECTED_PUBLIC?) |
