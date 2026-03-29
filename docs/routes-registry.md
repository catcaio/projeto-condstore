# CONDSTORE OS - Routes Registry

| Path | Name | Scope | Auth | Owner | Status | Observações |
|---|---|---|---|---|---|---|
| / | TBA | public | none | PUBLIC | live | Auto-detected |
| /about | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/app/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/login | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/logout | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/me | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/seed-admin | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/auth/signup | POST | public | none | auth | live | Email signup with role selection and invite validation |
| /api/auth/google | GET | public | none | auth | live | Google OAuth initiation (redirect to consent screen) |
| /api/auth/google/callback | GET | public | none | auth | live | Google OAuth callback (code exchange + session) |
| /api/auth/email/send-verify | POST | public | none | auth | live | Resend email verification link |
| /api/auth/email/verify | GET | public | none | auth | live | Email verification token handler |
| /api/auth/invite | POST | internal | required | auth | live | Team invite link handler |
| /api/billing/subscription | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/checkout | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/analytics/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/analytics/summary | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/attribution/tokens | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/audit | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/billing/checkout | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/billing/upgrade | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/domine/connectors | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/domine/summary | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/finops | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/finops/alerts | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/finops/unlock | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/metrics | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/metrics/acquisition | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/metrics/acquisition/drilldown | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/metrics/freight | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/metrics/funnel | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/ops/run-rollup | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/ops/status | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/saved-views | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/status | TBA | internal | required | cockpit | live | Returns system health status for Cockpit dashboard |
| /api/cockpit/system-status | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cron/cleanup | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/db/migrate | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/debug/tenants | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/domine/intake | POST | public | controlled | domine | live | Universal Intake v1 — versioned, idempotent event ingestion |
| /api/ecosystem/events | Ecosystem operational events feed | session | standard | INTERNAL | live | Event bus feed |
| /api/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/health | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/history | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/auth/reset-admin | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/billing/reconcile-stripe | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/dev/session | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/diag | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/diag/recovery | GET | internal | required | ops | live | DR readiness check: DB, Redis, migrations, backup envs |
| /api/internal/tenants/[tenantId]/data-contract-status | GET | internal | required | ops | live | Tenant data contract readiness check (per-dimension) |
| /api/internal/tenants/[tenantId]/supreme-permissions | GET, PUT | internal | required | ops | live | FRANK SUPREMO permission flags per tenant |
| /api/internal/tenants/[tenantId]/operational-events | GET | internal | required | ops | live | Operational event query with domain/type/date filters |
| /api/internal/tenants/[tenantId]/metrics/core | GET | internal | required | ops | live | Core business metrics from operational_events (5 domains) |
| /api/internal/tenants/[tenantId]/actions | GET | internal | required | ops | live | List tenant actions (filter: status, scope, limit) |
| /api/internal/tenants/[tenantId]/actions/propose | POST | internal | required | ops | live | Propose a new governed action |
| /api/internal/tenants/[tenantId]/actions/[actionId]/approve | POST | internal | required | ops | live | Approve a PROPOSED action |
| /api/internal/tenants/[tenantId]/actions/[actionId]/reject | POST | internal | required | ops | live | Reject a PROPOSED/APPROVED action |
| /api/internal/tenants/[tenantId]/actions/[actionId]/execute | POST | internal | required | ops | live | Execute an APPROVED action (requires supreme permission) |
| /api/internal/tenants/[tenantId]/supreme/analyze | POST | internal | requireAdmin | backend | live | FRANK SUPREMO manually trigger analysis engine |
| /api/internal/tenants/[tenantId]/supreme/findings | GET | internal | requireAdmin | backend | live | List and filter generated findings |
| /api/internal/tenants/[tenantId]/supreme/findings/[findingId]/propose-action | POST | internal | requireAdmin | backend | live | Forwards finding recommendation to Action Engine |
| /api/internal/tenants/[tenantId]/supreme/findings/[findingId]/resolve | POST | internal | requireAdmin | backend | live | Mark finding as resolved manually |
| /api/internal/tenants/[tenantId]/supreme/benchmarks | GET | internal | requireAdmin | backend | live | Retrieve safe percentile comparisons for the tenant |
| /api/internal/jobs/supreme-benchmark-refresh | POST | internal | requireAdmin | backend | live | Global periodic benchmark percentile recalculation |
| /api/internal/playbooks | GET | internal | requireAdmin | backend | live | List global Supreme Playbooks |
| /api/internal/playbooks/[playbookId]/toggle | POST | internal | requireAdmin | backend | live | Enable/disable a playbook |
| /api/internal/tenants/[tenantId]/playbooks/[playbookId]/simulate | POST | internal | requireAdmin | backend | live | Execute a playbook (propose actions) against a tenant's findings |
| /api/internal/bootstrap-admin | POST | internal | required | ops | live | One-time secure admin bootstrap |
| /api/internal/events/dlq | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/events/metrics | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/exports/frank-events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/frank/apply-rollback | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/frank/gate | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/frank/metrics | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/security/events | GET | internal | required | ops | live | Security Cockpit observability metrics |
| /api/internal/frank/scheduler/run | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/health/ai | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/health/db | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/health/qdrant | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/health/redis | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/health/webhook | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/backfill-phone | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/cleanup-retention | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/data-retention | POST | internal | requireInternalToken | lgpd | live | LGPD automated data retention purge (purge_at) |
| /api/internal/jobs/data-contract-scan | POST | internal | required | ops | live | Periodic tenant data contract compliance scan |
| /api/internal/jobs/domine-process | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/finops-reconciliation | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/rollup-backfill | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/rollup-daily | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/jobs/security-anomaly-scan | POST | internal | required | ops | live | Periodic anomaly scan for security_edge_events |
| /api/internal/freight/packing-profiles | GET,POST | internal | requireAdmin | frete | live | Packing profiles CRUD (list + create) |
| /api/internal/freight/packing-profiles/[id] | PUT | internal | requireAdmin | frete | live | Update packing profile |
| /api/internal/freight/packing-profiles/[id]/toggle | PATCH | internal | requireAdmin | frete | live | Toggle packing profile active state |
| /api/internal/freight/packing-profiles/[id]/review-status | PATCH | internal | requireAdmin | frete | live | Advance packing profile review status |
| /api/internal/freight/carrier-tables | GET,PATCH | internal | requireAdmin | frete | live | Carrier freight tables CRUD (read + update fields) |
| /api/internal/freight/simulate | POST | internal | requireAdmin | frete | live | Manual freight simulation with multi-volume input |
| /api/internal/freight/operational-settings | GET,PATCH | internal | requireAdmin | frete | live | Cockpit-managed operational packing/freight settings |
| /api/internal/freight/audit | GET | internal | requireAdmin | frete | live | Freight audit log — simulations and confirmations |
| /api/internal/freight/memory | GET | internal | requireAdmin | frete | live | Freight memory — aggregated recurring patterns |
| /api/internal/freight/confirm | POST | internal | requireAdmin | frete | live | Confirm freight quote and create confirmation record |
| /api/internal/freight/insights | GET | internal | requireAdmin | frete | live | Freight insights — performance analytics and divergence |
| /api/internal/ops | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/qa/bootstrap-session | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/qa/setup | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/qdrant/reindex | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/rag/stats | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/ask | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/collections | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/collections/[id]/sync | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/documents | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/documents/[id] | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/documents/[id]/mark-sensitive | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/documents/[id]/reprocess | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/upload/complete | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/knowledge/upload/init | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/metrics/freight | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/metrics/freight/timeseries | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/metrics/overview | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/metrics/rate-limit | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/metrics/rate-limit-alerts | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/notifications | Cockpit notifications endpoint | session | standard | INTERNAL | live | Operator notifications |
| /api/painel-logistico | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/public/cotacao/intent | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/public/cotacao/quotes | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/public/delivery/[token]/location | POST | public | controlled | PUBLIC | live | Delivery GPS Webhook |
| /api/public/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/reports/ingest | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/reports/seed | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/search | Global workspace search | session | standard | INTERNAL | live | Cross-module search |
| /api/simulate | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/supreme/ecosystem | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/ai-provider | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/ai-provider/rotate-key | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/audit | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/deliveries | GET | internal | required | admin | live | Active deliveries tracking |
| /api/tenants/[tenantId]/deliveries/[id] | GET | internal | required | admin | live | Single delivery details |
| /api/tenants/[tenantId]/domine/actions | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/connectors/orders/event | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/dlq | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/dlq/retry | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/events | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/events/[id] | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/events/publish | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/freight/latest | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/orders | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/domine/orders/[orderId] | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/health | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/knowledge/sources | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/knowledge/sources/[sourceId]/ready | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/privacy/[action] | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/privacy/export-user | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/privacy/purge-user | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/secrets | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/secrets/rotate | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/secrets/test | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/tenants/[tenantId]/settings | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/webhook | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/webhook/fallback | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/webhook/stripe | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/cockpit/conversations | GET | internal | requireAdmin | cockpit | live | List conversations |
| /api/cockpit/conversations/[id] | GET | internal | requireAdmin | cockpit | live | Get conversation details |
| /api/cockpit/conversations/[id]/message | POST | internal | requireAdmin | cockpit | live | Send operator response via Twilio |
| /api/cockpit/conversations/[id]/customer | POST | internal | requireAdmin | cockpit | live | Create CRM customer from active conversation |
| /api/cockpit/conversations/[id]/quotes | GET, POST | internal | requireAdmin | cockpit | live | List and create freight quotes in conversation |
| /api/cockpit/conversations/[id]/quotes/[quoteId]/order | POST | internal | requireAdmin | cockpit | live | Convert quote into physical logistics Order |
| /api/cockpit/conversations/[id]/quotes/[quoteId]/send | POST | internal | requireAdmin | cockpit | live | Send freight quote to customer via WhatsApp |
| /api/cockpit/conversations/[id]/stage | PATCH | internal | requireAdmin | cockpit | live | Update conversation stage for CRM |
| /api/cockpit/orders | GET | internal | requireAdmin | cockpit | live | List created logistic orders |
| /api/cockpit/orders/[id] | GET | internal | requireAdmin | cockpit | live | specific order details |
| /api/cockpit/orders/[id]/shipment | GET, PATCH | internal | requireAdmin | cockpit | live | Load and update the logistical tracking of an order |
| /api/cockpit/orders/[id]/status | PATCH | internal | requireAdmin | cockpit | live | Change order fulfillment status |
| /api/cockpit/pipeline | GET | internal | requireAdmin | cockpit | live | Fetch pipeline metrics and pipeline list |
| /api/cockpit/pipeline/metrics | GET | internal | requireAdmin | cockpit | live | Fetch pipeline numeric metrics for dasboard |
| /cockpit/atendimento | GET | frontend | requireAdmin | cockpit | live | Cockpit Human Atendimento UI |
| /cockpit/orders | GET | frontend | requireAdmin | cockpit | live | CRM Order Module Kanban |
| /cockpit/orders/[id] | GET | frontend | requireAdmin | cockpit | live | Order Details Read Page |
| /cockpit/pipeline | GET | frontend | requireAdmin | cockpit | live | Cockpit CRM Pipeline Kanban UI |
| /api/webhooks/stripe | TBA | public | none | PUBLIC | live | Auto-detected |
| /api/internal/freight/shipments | GET,POST | internal | requireAdmin | frete | live | Internal API for tracking and manual generation of shipping labels |
| /api/webhooks/melhor-envio | POST | public | none | PUBLIC | live | Webhook intake for shipment tracking and freight auto-confirmation |
| /api/freight/simulate | POST | internal | requireAdmin | frete | live | Manual freight simulator — session-protected proxy to internal simulate handler |
| /api/freight/shipments | GET,POST | internal | requireAdmin | frete | live | Logistica shipments panel — enriched shipments with confirmed/delta values + label creation |
| /api/freight/insights | GET | internal | requireAdmin | frete | live | Freight intelligence insights — top CEPs, carriers, avg delta, top routes |
| /api/sales/quote | POST | internal | requireAdmin | vendas | live | Sales quote — resolves packing, runs multi-carrier quote, returns prices |
| /api/freight/create-shipment | POST | internal | requireAdmin | frete | live | Create shipment from quote — inserts freight_shipments + freight_confirmations |
| /api/orders/create-from-quote | POST | internal | required | pedidos | live | Create order from freight simulation |
| /api/whatsapp/incoming | POST | public | none | PUBLIC | live | WhatsApp incoming webhook — Frank auto-quote with Twilio signature verification |
| /attribution | TBA | public | none | PUBLIC | live | Auto-detected |
| /billing | TBA | public | none | PUBLIC | live | Auto-detected |
| /billing/manage | TBA | public | none | PUBLIC | live | Auto-detected |
| /billing/success | TBA | public | none | PUBLIC | live | Auto-detected |
| /clientes | GET | internal | required | clientes | live | Cliente 360 canônico com lista, perfil e contexto operacional |
| /cockpit | GET | internal | required | cockpit | live | Cockpit operacional canônico com KPIs, alertas, feed, filas e status do sistema |
| /cockpit/shipments | GET | internal | requireAdmin | frete | live | Shipment monitoring panel and label generation log |
| /cockpit/acquisition | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/acquisition/activation | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/acquisition/drilldown | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/analytics | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/audit | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/deliveries | GET | internal | required | cockpit | live | Monitoramento de Entregas |
| /cockpit/domine | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/domine/dlq | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/equipe | GET | internal | required | cockpit | live | Team management page |
| /cockpit/domine/health | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/finops/alerts | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/funcionalidades | GET | internal | required | cockpit | live | Cockpit module pinning for TV and dashboard |
| /cockpit/knowledge | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/knowledge/ask | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/knowledge/collections | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/knowledge/documents/[docId]/versions/[versionId]/chunks/[chunkId] | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/marciano/[...slug] | GET | internal | required | cockpit | live | Placeholder visual para rotas Marciano |
| /cockpit/overview | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/privacy | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/rate-limit | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/security | GET | internal | required | cockpit | live | Security Cockpit Dashboard |
| /cockpit/metrics | GET | internal | required | cockpit | live | Business metrics cockpit (operational_events, 5 domains) |
| /cockpit/actions | GET | internal | required | cockpit | live | Action Engine cockpit — propose/approve/reject/execute lifecycle |
| /cockpit/supreme | GET | internal | required | cockpit | live | FRANK SUPREMO findings dashboard |
| /cockpit/supreme/benchmarks | GET | internal | required | cockpit | live | Benchmark comparisions between tenant and anonymous segment peer percentiles |
| /cockpit/playbooks | GET | internal | required | cockpit | live | Supreme Playbooks management |
| /cockpit/settings/knowledge | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/settings/security | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/status | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/status/audit | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/system-status | TBA | public | none | PUBLIC | live | Auto-detected |
| /cockpit/packing-profiles | GET | internal | requireAdmin | frete | live | Packing profiles admin review UI |
| /cockpit/carrier-tables | GET | internal | requireAdmin | frete | live | Carrier freight tables operational view |
| /cockpit/freight-simulator | GET | internal | requireAdmin | frete | live | Manual freight quotation simulator (cockpit) |
| /cockpit/packing-rules | GET | internal | requireAdmin | frete | live | Operational packing rules and freight settings control center |
| /cockpit/freight-audit | GET | internal | requireAdmin | frete | live | Freight audit log — simulation and confirmation history |
| /cockpit/freight-memory | GET | internal | requireAdmin | frete | live | Freight memory — aggregated recurring patterns |
| /cockpit/freight-insights | GET | internal | requireAdmin | frete | live | Freight operational intelligence and performance analytics |
| /configuracoes | GET | internal | required | configuracoes | live | Governança canônica de usuários, permissões, integrações, AI provider e auditoria |
| /conversas | GET | internal | required | conversas | live | Inbox operacional canônica com lista, thread e contexto do cliente |
| /logistica/envios | GET | internal | requireAdmin | frete | live | Painel de Envios — tabela enriched com tracking, status, delta financeiro |
| /logistica/rastreamento | GET | internal | requireAdmin | frete | live | Rastreamento — timeline de status por envio (posted → delivered) |
| /logistica/insights | GET | internal | requireAdmin | frete | live | Insights de Frete — CEPs, transportadoras, delta médio, top rotas |
| /logistica/tabelas-frete | Tabelas de Frete | internal | requireAdmin | logistica | live | Cockpit para gerenciamento das tabelas de frete |
| /logistica/tabelas-frete/[carrier] | Tabela de Frete por Transportadora | internal | requireAdmin | logistica | live | Edição de regras, zonas e tarifas da transportadora |
| /dashboard | GET | internal | required | cockpit | live | Alias legado redirecionado para o cockpit canônico |
| /vendas/cotacao | GET | internal | required | console | live | Nova Cotação (stub — em breve) |
| /vendas/pedidos | GET | internal | required | pedidos | live | Alias legado redirecionado para /pedidos |
| /vendas/clientes | GET | internal | required | clientes | live | Alias legado redirecionado para /clientes |
| /logistica/simulador | GET | internal | requireAdmin | frete | live | Simulador de Frete (migrado de /cockpit/freight-simulator) |
| /frank | GET | internal | required | frank | live | Módulo canônico do agente com visão geral, intenções, desempenho e logs estruturados |
| /logistica | GET | internal | required | logistica | live | Central logística canônica com fila, detalhe operacional e contexto integrado |
| /metricas | GET | internal | required | metricas | live | Módulo canônico de métricas executivas, funil, atendimento e logística |
| /operacao | GET | internal | required | operacao | live | Hub operacional canônico para visão transversal da operação |
| /operacao/inbox | GET | internal | required | console | live | Inbox operacional (migrado de /inbox) |
| /operacao/fila | GET | internal | required | console | live | Fila de Eventos DOMINE (stub — em breve) |
| /pedidos | GET | internal | required | pedidos | live | Fluxo operacional canônico de pedidos com triagem, detalhe e contexto logístico |
| /financeiro/frete | GET | internal | required | console | live | Custos de Frete (stub — em breve) |
| /financeiro/margem | GET | internal | required | console | live | Margem operacional (stub — em breve) |
| /sistema/health | GET | internal | requireAdmin | console | live | Health & Resiliência (migrado de /cockpit/status) |
| /sistema/dlq | GET | internal | requireAdmin | console | live | Dead Letter Queue (migrado de /cockpit/domine/dlq) |
| /sistema/logs | GET | internal | required | console | live | Logs & Auditoria (stub — em breve) |
| /sistema/security | GET | internal | requireAdmin | console | live | Security Cockpit (migrado de /cockpit/security) |
| /concept-layer-preview | TBA | public | none | PUBLIC | live | Auto-detected |

| /cotacao | TBA | public | none | PUBLIC | live | Auto-detected |
| /cotacao/result | TBA | public | none | PUBLIC | live | Auto-detected |
| /docs | TBA | public | none | PUBLIC | live | Auto-detected |
| /evolution | TBA | public | none | PUBLIC | live | Auto-detected |
| /evolution/[id] | TBA | public | none | PUBLIC | live | Auto-detected |
| /evolution/roadmap | TBA | public | none | PUBLIC | live | Auto-detected |
| /freight/simulations | TBA | public | none | PUBLIC | live | Auto-detected |
| /freight/simulations/[id] | TBA | public | none | PUBLIC | live | Auto-detected |
| /home | GET | internal | required | cockpit | live | Alias legado redirecionado para o cockpit canônico |
| /inbox | TBA | public | none | PUBLIC | live | Auto-detected |
| /inbox/conversations/[id] | TBA | public | none | PUBLIC | live | Auto-detected |
| /login | TBA | public | none | PUBLIC | live | Auto-detected |
| /painel-logistico | TBA | public | none | PUBLIC | live | Auto-detected |
| /pricing | Pricing redirect | public | none | PUBLIC | live | Canonical redirect to /planos/envios preserving query string |
| /planos/crm | TBA | public | none | PUBLIC | live | Auto-detected |
| /planos/domine | TBA | public | none | PUBLIC | live | Auto-detected |
| /planos/envios | TBA | public | none | PUBLIC | live | Auto-detected |
| /produtos/crm | TBA | public | none | PUBLIC | live | Auto-detected |
| /produtos/domine | TBA | public | none | PUBLIC | live | Auto-detected |
| /produtos/envios | TBA | public | none | PUBLIC | live | Auto-detected |
| /gargalos-logisticos | TBA | public | none | PUBLIC | live | Auto-detected |
| /integracoes | TBA | public | none | PUBLIC | live | Auto-detected |
| /tecnologias | TBA | public | none | PUBLIC | live | Auto-detected |
| /tenant | GET | internal | required | tenant | live | Módulo canônico de visão do tenant, branding, canais e status operacional |
| /plataforma | TBA | public | none | PUBLIC | live | Auto-detected |
| /plataforma/cockpit | TBA | public | none | PUBLIC | live | Auto-detected |
| /avaliacao | TBA | public | none | PUBLIC | live | Auto-detected |
| /settings | TBA | public | none | PUBLIC | live | Auto-detected |
| /showcase | GET | public | none | PUBLIC | live | Product showcase overview page |
| /signup | GET | public | none | auth | live | User registration page with role selection |
| /supreme | TBA | public | none | PUBLIC | live | Auto-detected |
| /t/[token] | TBA | public | none | PUBLIC | live | Auto-detected |
| /como-funciona | TBA | public | none | PUBLIC | live | Added manually to fix CI |
| /solucoes | TBA | public | none | PUBLIC | live | Added manually to fix CI |
| /implantacao | TBA | public | none | PUBLIC | live | Implantação page |
| /valores | TBA | public | none | PUBLIC | live | Valores/pricing page |
| /seguranca | TBA | public | none | PUBLIC | live | Security and governance page |
| /casos | TBA | public | none | PUBLIC | live | Use cases page |
| /app | TBA | public | none | PUBLIC | live | App do Ecossistema page |
| /privacidade | TBA | public | none | PUBLIC | live | Política de Privacidade |
| /termos | TBA | public | none | PUBLIC | live | Termos de Uso |
| /api/cockpit/frank/knowledge | GET,POST | internal | required | cockpit | live | Frank Knowledge Base CRUD |
| /api/cockpit/frank/knowledge/[id] | GET,PUT,DELETE | internal | required | cockpit | live | Frank Knowledge Base item CRUD |
| /api/cockpit/frank/suggestions | GET | internal | required | cockpit | live | Frank Suggestions list |
| /api/cockpit/frank/suggestions/[id]/approve | POST | internal | required | cockpit | live | Frank Suggestions approval |
| /api/cockpit/metrics/frank | GET | internal | required | cockpit | live | Frank metrics for dashboard |
| /cockpit/frank | GET | internal | required | cockpit | live | Frank cockpit main page |
| /cockpit/frank/playbooks | GET | internal | required | cockpit | live | Frank playbooks management page |

| /api/cockpit/config | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/config/[key] | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/custom-fields | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/custom-fields/[id] | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/custom-fields/values | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/suggestions/[id]/reject | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/playbooks | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/playbooks/[id] | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/timeline | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/configuracoes/[category] | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/configuracoes/campos | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/rooms/[room] | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/timeline | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/intents | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/intents/[id]/ignore | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/intents/[id]/validate | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/frank/intents | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/intents/[id]/create-playbook | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/intents/[id]/link-playbook | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/playbooks | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/assign | POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/release | POST | internal | required | cockpit | live | Added |
| /api/whatsapp/status | POST | public | none | PUBLIC | live | Added |
| /api/cockpit/conversations/[id]/notes | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/owner | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/quotes/[quoteId] | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/quotes/[quoteId]/accept | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/tasks | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/conversations/[id]/tasks/[taskId]/status | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/suggestions/[id]/approve-draft | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/frank/suggestions/[id]/draft | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/metrics/summary | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/products/search | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/organizations/[id] | PATCH | internal | required | cockpit | live | Added |
| /api/internal/jobs/seed-catalog | POST | internal | required | ops | live | Added |
| /cockpit/playbooks/[id] | GET/POST | internal | required | cockpit | live | Added |
| /cockpit/playbooks/new | GET/POST | internal | required | cockpit | live | Added |
| /api/cockpit/governance/playbooks | GET/POST | internal | requireAdmin | cockpit | live | Added |
| /api/cockpit/governance/playbooks/[playbookId]/apply | GET/POST | internal | requireAdmin | cockpit | live | Added |
| /api/cockpit/governance/playbooks/metrics | GET/POST | internal | requireAdmin | cockpit | live | Added |
| /api/cockpit/frank/feed | POST | internal | requireAdmin | cockpit | live | Added |