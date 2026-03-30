# AGENTS.md

## MVP Freeze

- Leia [`docs/mvp-freeze-plan.md`](./docs/mvp-freeze-plan.md) e [`docs/pr-test-scope.md`](./docs/pr-test-scope.md) antes de alterar escopo.
- Trate como `MVP Core` apenas operação supervisionada via WhatsApp, CRM operacional, cotação de frete, pedidos/shipments e cockpit diário de operação.
- Trate como `Frozen / Deferred` as superfícies descritas no plano de freeze, principalmente Frank runtime/training, knowledge/RAG, playbooks autorais, DOMINE Console e superfícies experimentais.

## Regras de Escopo

- Não expanda uma tarefa do core para áreas adjacentes ou frozen só porque existe código relacionado no mesmo fluxo.
- Use o menor conjunto de arquivos, módulos e testes compatível com segurança e regressão.
- Não mexa em áreas frozen sem justificativa explícita no pedido, no commit e na PR.
- Se precisar tocar uma dependência frozen por compatibilidade, prefira preservar a costura existente em vez de evoluir o subsistema congelado.

## Guardrails Operacionais

- Rode `npm run guardrail:mvp-freeze` antes de abrir PR quando a branch tocar superfícies de produto.
- Rode `npm run scope:pr-tests` para descobrir o menor conjunto de comandos compatível com os arquivos alterados.
- Registre evidência objetiva dos comandos executados e dos resultados na PR ou no fechamento da tarefa.
- Se usar `ALLOW_FROZEN_SURFACE_CHANGES=1`, explique o motivo na PR e aponte qual critério de unfreeze foi atendido.


## Agent Workflows

Os seguintes playbooks estão disponíveis no repositório:

### Core Rules
- .agents/rules/condstore-core.md
- .agents/rules/delivery-standard.md
- .agents/rules/security-core.md

### Workflows
- .agents/workflows/backend-specialist.md
- .agents/workflows/integration-flow-runner.md
- .agents/workflows/debugger.md
- .agents/workflows/pr-auditor.md
- .agents/workflows/feature-shipper.md

---

## Como usar workflows

Quando uma tarefa exigir um papel específico, o agente deve:

1. Ler o workflow correspondente em `.agents/workflows/`
2. Aplicar as regras em `.agents/rules/`
3. Executar a tarefa respeitando o escopo do MVP e guardrails

Se houver conflito:
- regras do AGENTS.md prevalecem
- depois rules/
- depois workflow