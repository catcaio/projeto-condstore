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

### Core Rules (sempre-ativas — aplicam a todos os agentes)
- .agents/rules/condstore-core.md — estado real, sem suposição, fechamento de escopo
- .agents/rules/security-core.md — tenant isolation, auth, PII
- .agents/rules/delivery-standard.md — checks antes de concluir, drift, métricas
- .agents/rules/mvp-freeze.md — guardrails de escopo MVP, superfícies frozen

### Orquestração
- .agents/workflows/agent-orchestrator.md — coordena múltiplos agentes em paralelo
- .agents/workflows/task-decomposer.md — quebra frentes em tarefas executáveis
- .agents/workflows/explorer-agent.md — mapeia codebase real antes de execução

### Produto e Arquitetura
- .agents/workflows/product-lead.md — discovery, PRD, backlog, priorização
- .agents/workflows/solution-architect.md — decisões arquiteturais completas

### Domínio CONDSTORE
- .agents/workflows/atendimento-specialist.md — WhatsApp, Twilio, pipeline de conversação
- .agents/workflows/freight-flow-specialist.md — cotação multicarrier, circuit breaker, pedido
- .agents/workflows/frank-supervisor.md — AI supervisionada, tool-guard, gateway LLM
- .agents/workflows/cockpit-validator.md — painéis, filas, métricas, consistência
- .agents/workflows/database-architect.md — schema, migrations, índices, drift

### Implementação
- .agents/workflows/feature-shipper.md — feature completa ponta a ponta, pronta para merge
- .agents/workflows/backend-specialist.md — API, regras de negócio, integrações
- .agents/workflows/frontend-specialist.md — UI/UX, componentes, estados
- .agents/workflows/mobile-developer.md — iOS, Android, React Native
- .agents/workflows/seo-specialist.md — SEO técnico, metadata, indexação

### Qualidade e Validação
- .agents/workflows/qa-validator.md — testes funcionais reais via browser e API
- .agents/workflows/qa-automation-engineer.md — automação E2E e integração no CI
- .agents/workflows/test-generator.md — unit e integration tests
- .agents/workflows/integration-flow-runner.md — fluxo ponta a ponta em ambiente real
- .agents/workflows/browser-automation-agent.md — validação visual via browser

### PR e Release
- .agents/workflows/preflight-release-guard.md — pré-fechamento, merge conflicts, blockers
- .agents/workflows/pr-auditor.md — auditoria completa da PR
- .agents/workflows/pr-closer.md — fechamento final no GitHub

### Investigação e Manutenção
- .agents/workflows/debugger.md — causa raiz com evidência, nunca no chute
- .agents/workflows/code-archaeologist.md — legado, dívida técnica, refatoração segura
- .agents/workflows/data-consistency-enforcer.md — drift, inconsistência entre banco e código
- .agents/workflows/performance-optimizer.md — gargalos mensuráveis, antes/depois
- .agents/workflows/ci-autofixer.md — falhas de CI com patch mínimo e evidência
- .agents/workflows/devops-automator.md — CI/CD, deploy, variáveis de ambiente

### Segurança
- .agents/workflows/security-auditor.md — auth, PII, rotas críticas
- .agents/workflows/penetration-tester.md — testes ofensivos controlados
- .agents/workflows/tenant-isolation-auditor.md — vazamento entre tenants

### Documentação
- .agents/workflows/docs-runbook-keeper.md — documentação técnica, runbooks, padrões

---

## Como usar workflows

Quando uma tarefa exigir um papel específico, o agente deve:

1. Ler o workflow correspondente em `.agents/workflows/`
2. Aplicar as regras em `.agents/rules/` (todas as 4 são sempre-ativas)
3. Executar a tarefa respeitando o escopo do MVP e guardrails

Se houver conflito:
- regras do AGENTS.md prevalecem
- depois rules/
- depois workflow