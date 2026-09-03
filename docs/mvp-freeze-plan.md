# MVP Freeze Plan

## Objetivo

Congelar com segurança as áreas que não entram no MVP supervisionado vendável do CONDSTORE OS e reduzir armadilhas de escopo em PRs futuras.

## Recorte Atual do MVP

O recorte do MVP foi inferido do estado real de `origin/main` em `2026-03-29`, principalmente a partir de:

- `README.md`
- `ARCHITECTURE.md`
- `docs/current-product-state.md`
- `docs/ops/golive-scope.md`
- rotas e módulos ativos em `src/app/**` e `src/modules/**`

O MVP atual é um sistema supervisionado para operação comercial B2B via WhatsApp, CRM operacional, cotação de frete e cockpit de execução. O operador humano continua no centro do fluxo; automações devem ajudar, não decidir sozinhas.

## Classificação de Áreas

### MVP Core

| Área | Paths principais | Motivo |
|---|---|---|
| WhatsApp supervisionado | `src/modules/atendimento/**`, `src/app/api/whatsapp/**`, `src/server/twilio/**`, `src/app/(app)/cockpit/atendimento/**`, `src/app/api/cockpit/conversations/**` | É o canal operacional principal descrito no estado atual do produto. |
| CRM operacional | `src/modules/crm/**`, `src/modules/clientes/**`, `src/modules/customers/**`, `src/modules/conversas/**`, `src/modules/timeline/**`, `src/app/(app)/cockpit/pipeline/**` | Sustenta acompanhamento comercial, pipeline e histórico do cliente. |
| Cotação de frete | `src/modules/freight/**`, `src/app/api/public/cotacao/**`, `src/app/api/cockpit/conversations/[id]/quotes/**`, `src/app/(app)/cockpit/freight/**` | Faz parte do fluxo principal de venda e atendimento. |
| Pedido e shipment | `src/modules/pedidos/**`, `src/modules/logistics/**`, `src/modules/logistica/**`, `src/modules/shipping/**`, `src/app/api/orders/**`, `src/app/(app)/cockpit/orders/**` | Fecha o ciclo quote -> order -> shipment que o produto já opera. |
| Cockpit diário | `src/modules/cockpit/**`, `src/app/(app)/cockpit/**` exceto superfícies frozen listadas abaixo | É a interface operacional central do MVP. |

### Adjacent / Support

| Área | Paths principais | Papel |
|---|---|---|
| Segurança, auth e multi-tenant | `src/infra/auth/**`, `src/infra/security/**`, `src/middleware.ts`, `src/app/api/auth/**` | Bloqueia regressões críticas; não é tema de expansão de produto nesta fase. |
| Observabilidade e auditoria | `src/infra/log/**`, `src/infra/observability/**`, `src/app/api/cockpit/audit/**`, `src/modules/audit/**`, `src/modules/system-status/**` | Necessário para operar o MVP com governança. |
| Billing e FinOps | `src/modules/billing/**`, `src/modules/finops/**`, `src/app/api/webhook/stripe/**`, `src/app/api/cockpit/billing/**` | Suporte comercial/operacional, mas não o centro do MVP atual. |
| Attribution, funnel e métricas | `src/infra/attribution/**`, `src/modules/funnel/**`, `src/modules/metrics/**`, `src/modules/analytics/**`, `src/app/(app)/cockpit/acquisition/**` | Ajuda aquisição e leitura do funil; não deve puxar escopo para além do core. |
| DOMINE como infraestrutura | `src/domine/**`, `src/modules/domine/**`, `src/lib/events/**`, `src/app/api/domine/intake/**`, `src/app/api/internal/jobs/domine-process/**` | Continua como trilho de eventos e integração, não como frente principal de produto. |
| Costuras supervisionadas do Frank usadas pelo core | `src/modules/frank/entity-resolver.ts`, `src/modules/frank/intent-resolver.ts`, `src/modules/frank/session.repository.ts`, `src/modules/frank/conversation-control.ts`, `src/modules/frank/auto-response-guard.ts`, `src/modules/frank/suggestions/**` | São dependências técnicas do WhatsApp supervisionado; manter compatibilidade, sem expandir o subsistema. |

### Frozen / Deferred

| Área | Paths principais | Status |
|---|---|---|
| Frank runtime autônomo, treinamento e consoles | `src/app/(app)/frank/**`, `src/app/(app)/cockpit/frank/**`, `src/app/api/cockpit/frank/intents/**`, `src/app/api/cockpit/frank/knowledge/**`, `src/app/api/cockpit/frank/playbooks/**`, `src/app/api/cockpit/metrics/frank/**`, `src/app/api/internal/frank/**`, `src/modules/frank/intents/**`, `src/modules/frank/knowledge/**`, `src/modules/frank/playbooks/**`, `src/modules/frank/workers/**`, `src/modules/frank/ui/global-assistant/**` | Congelado para evitar desvio do MVP supervisionado. |
| Knowledge / RAG authoring | `src/modules/knowledge/**`, `src/app/api/knowledge/**`, `src/app/(app)/cockpit/knowledge/**`, scripts `*qdrant*`, `ingest-docs*` | Fora do recorte vendável imediato. |
| Playbooks autorais e treinamento | `src/modules/playbooks/**`, `src/app/(admin)/cockpit/playbooks/**`, `src/app/api/cockpit/playbooks/**` | Manter estável, sem ampliar. |
| DOMINE Console e control plane visual | `src/app/(app)/cockpit/domine/**`, `src/app/api/cockpit/domine/**`, `src/app/(app)/operacao/**`, `src/app/(app)/sistema/dlq/**` | A infraestrutura fica; a superfície de produto/console não entra no MVP atual. |
| Superfícies experimentais e narrativas | `src/app/evolution/**`, `src/app/(app)/supreme/**`, `src/app/(app)/cockpit/deliveries/**`, `src/app/(app)/cockpit/freight-insights/**`, `src/app/(app)/cockpit/freight-memory/**`, `src/app/(app)/cockpit/freight-simulator/**` | Não destravar sem decisão explícita de produto. |

## O que Está Explicitamente Fora do MVP Agora

- Frank autônomo respondendo sozinho em nome do operador.
- Treinamento de intents, playbooks e knowledge base como frente ativa de produto.
- RAG/Qdrant como dependência obrigatória do fluxo principal.
- DOMINE Console, DLQ manager e conectores como foco de evolução de UI.
- Evolution/roadmap/storytelling pages e superfícies experimentais tipo `supreme`.

## Regras do que Não Mexer

- Não iniciar refactor, limpeza ou redesign em áreas frozen sem pedido explícito.
- Não puxar uma tarefa do core para treinamento de Frank, knowledge ou DOMINE Console porque o fluxo usa esses nomes.
- Não mover arquivos entre core e frozen só para “organizar” o repositório.
- Não usar mudanças em marketing, roadmap ou superfícies experimentais como parte de uma PR do MVP.

## Critérios para Tirar Algo do Freeze

Uma área frozen só sai do freeze quando todos os itens abaixo estiverem explícitos na tarefa ou PR:

1. Existe objetivo de produto ou operação ligado ao MVP atual, não a exploração.
2. Há owner claro da superfície e plano de rollback/flag.
3. As dependências com Core e Support foram mapeadas.
4. O escopo de testes foi ampliado em `docs/pr-test-scope.md` e executado.
5. A PR explica por que o risco extra vale a pena agora.

## Dependências Ocultas e Armadilhas

1. `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` importa costuras de `src/modules/frank/*` para resolver intent, sessão, guard e sugestões. Congelar Frank não significa remover essas costuras; significa não transformar esse subsistema em centro do roadmap.
2. `src/app/(app)/cockpit/atendimento/atendimento.client.tsx` renderiza `FrankSuggestionPanel`, contexto de sessão e `PlaybookQuickActions`. Mudanças em atendimento podem tocar UI frozen por tabela se o agente não limitar o diff.
3. `src/modules/cockpit/rooms/rooms.registry.ts` e `src/modules/cockpit/rooms/subrooms.registry.ts` continuam listando salas Frank. Alterações no launcher podem reabrir escopo frozen sem intenção.
4. `src/app/api/cockpit/conversations/[id]/quotes/[quoteId]/send/route.ts` e `src/app/api/public/cotacao/quotes/route.ts` publicam eventos para DOMINE. O console DOMINE está frozen, mas o barramento continua sendo suporte do MVP.
5. `src/app/api/cockpit/audit/route.ts` e telas de status cruzam dados de `domineEvents`; uma mudança em auditoria pode exigir olhar suporte DOMINE mesmo sem tocar a UI do console.
6. `src/ui/shell/app-shell.tsx` ainda importa `FrankGlobalWidget`. Mudanças amplas de shell podem despertar trabalho em área frozen mesmo quando a demanda era só operacional.

## Guardrails Implementados

- `AGENTS.md` na raiz com regras de freeze e validação.
- `npm run guardrail:mvp-freeze` para bloquear mudanças acidentais em superfícies hard-frozen.
- `npm run scope:pr-tests` para sugerir o menor conjunto de testes compatível com os paths alterados.
- Comentário de fronteira no registry do cockpit sinalizando a sala Frank como superfície congelada por padrão.
