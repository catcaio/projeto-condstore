# CONDSTORE OS — Cockpit Route Audit

> Auto-generated from `src/app/(app)` scan

## Cockpit Pages (38 routes)

| Rota Atual | Tipo | Módulo | Destino |
|---|---|---|---|
| `/cockpit` | page | cockpit root | canônico |
| `/cockpit/overview` | page | legacy overview | não orientar operador; usar `/cockpit` |
| `/cockpit/status` | page | sistema | `/sistema/health` |
| `/cockpit/status/audit` | page | sistema | `/sistema/logs` |
| `/cockpit/security` | page | sistema | `/sistema/security` |
| `/cockpit/rate-limit` | page | sistema | manter (baixa prioridade) |
| `/cockpit/analytics` | page | vendas | `/vendas/analytics` (futuro) |
| `/cockpit/acquisition` | page | vendas | `/vendas/cotacao` |
| `/cockpit/acquisition/activation` | page | vendas | `/vendas/cotacao/activation` (futuro) |
| `/cockpit/acquisition/drilldown` | page | vendas | `/vendas/cotacao/drilldown` (futuro) |
| `/cockpit/metrics` | page | métricas | manter como subrota de `/cockpit` |
| `/cockpit/actions` | page | operação | `/operacao/actions` (futuro) |
| `/cockpit/audit` | page | sistema | `/sistema/logs` (merge) |
| `/cockpit/carrier-tables` | page | logística | `/logistica/carrier-tables` (futuro) |
| `/cockpit/deliveries` | page | logística | `/logistica/deliveries` (futuro) |
| `/cockpit/domine` | page | operação | `/operacao/fila` |
| `/cockpit/domine/dlq` | page | sistema | `/sistema/dlq` |
| `/cockpit/domine/health` | page | sistema | `/sistema/health` (merge) |
| `/cockpit/equipe` | page | sistema | `/sistema/equipe` (futuro) |
| `/cockpit/finops/alerts` | page | financeiro | `/financeiro/alerts` (futuro) |
| `/cockpit/freight-audit` | page | logística | `/logistica/auditoria` (futuro) |
| `/cockpit/freight-insights` | page | logística | `/logistica/insights` ✅ já existe |
| `/cockpit/freight-memory` | page | logística | `/logistica/memoria` (futuro) |
| `/cockpit/freight-simulator` | page | logística | `/logistica/simulador` |
| `/cockpit/funcionalidades` | page | sistema | manter (baixa prioridade) |
| `/cockpit/knowledge` | page | operação | `/operacao/knowledge` (futuro) |
| `/cockpit/knowledge/ask` | page | operação | futuro |
| `/cockpit/knowledge/collections` | page | operação | futuro |
| `/cockpit/marciano/[...slug]` | page | placeholder | remover |
| `/cockpit/packing-profiles` | page | logística | `/logistica/packing` (futuro) |
| `/cockpit/packing-rules` | page | logística | `/logistica/regras` (futuro) |
| `/cockpit/playbooks` | page | operação | `/operacao/playbooks` (futuro) |
| `/cockpit/privacy` | page | sistema | `/sistema/privacy` (futuro) |
| `/cockpit/settings/knowledge` | page | sistema | futuro |
| `/cockpit/settings/security` | page | sistema | `/sistema/security` (merge) |
| `/cockpit/shipments` | page | logística | `/logistica/envios` ✅ já existe |
| `/cockpit/supreme` | page | operação | manter em `/supreme` |
| `/cockpit/supreme/benchmarks` | page | operação | manter em `/supreme/benchmarks` |

## Non-Cockpit Pages (9 routes)

| Rota Atual | Tipo | Módulo | Ação |
|---|---|---|---|
| `/home` | page | dashboard | manter |
| `/inbox` | page | operação | → `/operacao/inbox` |
| `/attribution` | page | vendas | → `/vendas/attribution` (futuro) |
| `/settings` | page | sistema | manter |
| `/supreme` | page | operação | manter |
| `/freight/simulations` | page | logística | → `/logistica/simulador` (merge ou remover) |
| `/logistica/envios` | page | logística | ✅ já migrada |
| `/logistica/rastreamento` | page | logística | ✅ já migrada |
| `/logistica/insights` | page | logística | ✅ já migrada |

## Scope desta Fase (Mover Agora)

As rotas a mover nesta entrega:

| De | Para | Migrar conteúdo |
|---|---|---|
| `/cockpit/freight-simulator` | `/logistica/simulador` | Sim — copiar page+client |
| `/cockpit/shipments` | `/logistica/envios` | ✅ já existe |
| `/cockpit/freight-insights` | `/logistica/insights` | ✅ já existe |
| `/cockpit` (root) | canônico | Não migrar para `/dashboard`; manter como rota operacional ativa |
| `/inbox` | `/operacao/inbox` | Sim — copiar page+client |
| `/cockpit/domine/dlq` | `/sistema/dlq` | Sim — copiar page+client |
| `/cockpit/security` | `/sistema/security` | Sim — copiar page+client |
| `/cockpit/status` | `/sistema/health` | Sim — copiar page+client |
