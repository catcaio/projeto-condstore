# AGENTS.md

> Documento de governança central do ecossistema de agentes do CONDSTORE OS.  
> Versão: 1.1  
> Atualizado: 17/05/2026 
> Este arquivo prevalece sobre todos os workflows e instruções de agentes em caso de conflito.

---

## O que é o CONDSTORE OS

O CONDSTORE OS é um SaaS multi-tenant para operação comercial supervisionada via WhatsApp, CRM operacional, cotação de frete, pedidos, logística, shipments, métricas e Cockpit diário de operação.

O MVP Core é voltado para operação real supervisionada, não automação autônoma.

Módulos centrais do MVP:

- **Atendimento:** sessões WhatsApp Business, CRM operacional, histórico e handoff humano.
- **Frete:** cotação multicarrier, fallback operacional, aceite de cotação.
- **Pedidos:** criação, confirmação, status e vínculo com logística.
- **Logística/Shipments:** criação de shipment, status logístico e rastreio operacional.
- **Cockpit:** métricas, filas, eventos, timeline e visão diária da operação.
- **Auth/RBAC:** autenticação multi-tenant, sessões, roles e isolamento de acesso.
- **Frank supervisionado:** apoio operacional com humano no loop, sem autonomia irreversível.

---

## Hierarquia de Precedência

Em caso de conflito entre instruções:

1. `AGENTS.md`
2. `.github/instructions/*`
3. `.github/agents/*`
4. instrução específica da tarefa/PR

Se duas instruções entrarem em conflito, siga a de maior precedência e registre a divergência na resposta ou na PR.

---

## Invariantes do Sistema

Estas regras nunca podem ser violadas:

1. Todo dado operacional pertence a exatamente um tenant.
2. Nenhum tenant pode acessar, listar, atualizar, excluir ou inferir dados de outro tenant.
3. Toda query multi-tenant deve filtrar por `tenantId`.
4. Todo update/delete multi-tenant deve filtrar por `tenantId`.
5. Nunca confiar em `tenantId`, `userId` ou role vindos de query/body/header externo sem validação.
6. Todo campo PII tem finalidade operacional clara.
7. Logs, snapshots, seeds, docs e testes não podem expor PII real.
8. Secrets, tokens, cookies e credenciais nunca entram no diff.
9. Frank não executa ação autônoma irreversível sem gate humano.
10. Fallback/mock nunca pode aparecer como dado real.
11. Toda mudança relevante exige evidência objetiva.
12. Nenhuma entrega é DONE por suposição.

---

## MVP Freeze

Antes de alterar escopo, leia:

- `docs/mvp-freeze-plan.md`
- `docs/pr-test-scope.md`

### MVP Core

Trate como core apenas:

- operação supervisionada via WhatsApp;
- CRM operacional;
- cotação de frete;
- aceite de cotação;
- pedidos;
- shipments/logística;
- Cockpit diário;
- métricas operacionais necessárias ao piloto;
- segurança, tenant isolation, LGPD e CI necessários ao MVP.

### Frozen / Deferred

Trate como congelado ou adiado:

- Frank runtime autônomo;
- Frank training;
- knowledge/RAG;
- playbooks autorais;
- DOMINE Console;
- superfícies experimentais;
- automações sem supervisão humana;
- expansão de produto fora do piloto.

---

## Regras de Escopo

- Não expandir tarefa core para área frozen só porque existe código relacionado.
- Usar o menor conjunto seguro de arquivos, módulos e testes.
- Não tocar superfície frozen sem justificativa explícita no pedido, commit e PR.
- Se precisar tocar dependência frozen por compatibilidade, preservar a costura existente.
- Não evoluir subsistema congelado por oportunismo.
- Não misturar refactor amplo com correção pontual.
- Não fragmentar uma frente em múltiplas PRs sem necessidade real.
- Padrão preferencial: `1 frente = 1 branch = 1 PR`.

---

## Critério de Unfreeze

Uma superfície frozen só pode ser alterada se TODOS os itens abaixo forem verdadeiros:

1. Existe decisão explícita de produto.
2. Existe justificativa documentada na PR.
3. O impacto no MVP Core está claro.
4. O risco foi classificado.
5. O teste mínimo foi definido.
6. A flag abaixo foi usada somente quando necessário:

```bash
ALLOW_FROZEN_SURFACE_CHANGES=1
````

A PR deve explicar:

* qual superfície frozen foi tocada;
* por que foi necessário;
* qual critério de unfreeze foi atendido;
* quais testes/gates foram executados;
* qual risco permanece.

---

## Guardrails Operacionais

Antes de abrir PR que toque superfície de produto:

```bash
npm run guardrail:mvp-freeze
```

Para descobrir o menor conjunto de testes compatível com os arquivos alterados:

```bash
npm run scope:pr-tests
```

Quando aplicável, também validar:

```bash
npm run typecheck
npm run routes:verify-security
npm run db:verify
npm run test:win-stable
npm run pilot:readiness
npm run mvp:release-candidate
npm run build
```

Use comandos específicos quando existirem:

```bash
npm run test:cockpit
npm run test:whatsapp
npm run test:freight
```

Todo comando executado deve ter evidência objetiva registrada na PR ou no fechamento da tarefa.

---

## Critério Global de DONE

Uma tarefa/frente só está DONE se:

1. Escopo foi respeitado.
2. Diff real corresponde ao objetivo declarado.
3. Não há overclaim no body da PR, docs ou relatório.
4. Código está consistente.
5. Testes relevantes passaram.
6. Typecheck passou quando aplicável.
7. Build passou quando aplicável.
8. Migrations estão commitadas quando houver schema change.
9. Zero schema drift quando aplicável.
10. Tenant isolation foi preservado.
11. LGPD/PII foi preservada.
12. Rotas sensíveis têm guards corretos.
13. Fallback/mock não mascara falha real.
14. Documentação foi atualizada quando necessário.
15. CI/checks críticos estão verdes no HEAD SHA atual.
16. `pr-auditor` foi acionado quando houver PR relevante.
17. `pr-closer` aprovou o fechamento quando houver PR.

Se qualquer item obrigatório falhar:

`NOT DONE`

---

## Anti-Overclaim

É proibido declarar algo que o diff não comprova.

Bloquear se:

* PR diz `docs-only`, mas altera runtime;
* PR diz `zero runtime`, mas altera código, config, rota, workflow ou package;
* PR afirma hardening de segurança sem alteração ou teste correspondente;
* PR afirma correção de webhook sem alteração/teste de webhook;
* PR afirma validação de piloto sem evidência real;
* PR omite mudança sensível;
* documentação promete feature inexistente;
* checklist contém dado fictício;
* fallback/mock aparece como dado real.

Overclaim é blocker de governança.

---

## Fluxos Críticos

Qualquer mudança nos fluxos abaixo exige validação reforçada:

* provisionamento e onboarding de tenant;
* login/signup/session;
* RBAC/admin/operator/manager;
* WhatsApp inbound/outbound;
* resolução de tenant por Twilio;
* atendimento no Cockpit;
* cotação de frete;
* aceite de cotação;
* criação de pedido;
* criação de shipment/logística;
* Cockpit/métricas/timeline;
* attribution/UTM;
* billing/Stripe;
* Frank supervisionado;
* kill switch/outboundEnabled/incidentMode;
* migrations/schema;
* webhooks Twilio/Stripe;
* rotas públicas e internas sensíveis.

---

## Segurança, Tenant Isolation e LGPD

Mudanças que toquem os itens abaixo exigem validação reforçada:

* auth;
* sessão;
* RBAC;
* middleware/proxy;
* cookies;
* tokens;
* webhooks;
* Twilio/Stripe;
* repositories;
* Drizzle queries;
* SQL;
* cache;
* métricas;
* Cockpit;
* pedidos;
* clientes;
* mensagens;
* logística;
* Frank/IA;
* logs;
* PII.

Regras obrigatórias:

* queries multi-tenant filtram por `tenantId`;
* update/delete multi-tenant filtram por `tenantId`;
* cache key inclui tenant quando aplicável;
* logs não expõem PII;
* snapshots/fixtures/seeds/docs não contêm PII real;
* erros não retornam dado sensível;
* payload público não expõe dado interno;
* secrets nunca aparecem no diff.

Se houver dúvida:

acionar `security-auditor` e `tenant-isolation-auditor`.

---

## Quando Parar e Aguardar Aprovação Humana

O agente deve pausar e aguardar aprovação humana antes de continuar quando a tarefa envolver:

* release/deploy em produção;
* migration DDL destrutiva;
* alteração irreversível;
* uso de dados reais com PII;
* alteração em billing/pagamento;
* ativação de Frank autônomo;
* alteração fora do MVP Core;
* uso de `ALLOW_FROZEN_SURFACE_CHANGES=1`;
* mudança em instruções de agentes;
* prosseguir apesar de blocker de `security-auditor`;
* prosseguir apesar de blocker de `tenant-isolation-auditor`;
* merge quando o pedido original não autorizou merge.

---

## Modificação de Agentes é Mudança de Produto

Arquivos em `.github/agents/*`, `.github/instructions/*` ou equivalentes definem comportamento operacional.

Toda PR que altera instrução de agente deve ser tratada como mudança de produto.

Exigir:

* escopo claro;
* diff revisado;
* ausência de conflito com outros agentes;
* documentação quando necessário;
* `pr-auditor`;
* `pr-closer`;
* revisão humana quando alterar autoridade, autonomia, segurança, merge, deploy, tenant ou PII.

---

## Fluxo Padrão Multiagente

Para frentes médias ou complexas:

1. `explorer-agent` — mapear estado real.
2. `task-decomposer` — quebrar plano em blocos, riscos, dependências e agentes.
3. `agent-orchestrator` — coordenar execução, locks e gates.
4. agente especializado — implementar ou validar domínio.
5. `test-generator` / `qa-validator` — cobrir risco real.
6. `security-auditor` / `tenant-isolation-auditor` — quando houver risco sensível.
7. `docs-runbook-keeper` — quando houver impacto documental.
8. `pr-auditor` — auditoria técnica da PR.
9. `pr-closer` — gate final no GitHub.

Nenhuma frente com PR termina sem `pr-closer`.

Nenhuma frente de release/deploy termina sem `preflight-release-guard`.

---

## Gates Obrigatórios por Risco

| Risco / Área                | Agentes obrigatórios                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| Schema / migration / drift  | `database-architect`, `data-consistency-enforcer`, `pr-closer`            |
| Tenant isolation            | `tenant-isolation-auditor`, `security-auditor`, `pr-closer`               |
| Auth / RBAC / session       | `security-auditor`, `penetration-tester`, `pr-closer`                     |
| PII / LGPD                  | `security-auditor`, `docs-runbook-keeper`, `pr-closer`                    |
| WhatsApp / Twilio / webhook | `atendimento-specialist`, `security-auditor`, `qa-validator`, `pr-closer` |
| Frete / pedido / shipment   | `freight-flow-specialist`, `qa-validator`, `pr-closer`                    |
| Cockpit / métricas          | `cockpit-validator`, `qa-validator`, `pr-closer`                          |
| Frank / IA supervisionada   | `frank-supervisor`, `security-auditor`, `qa-validator`, `pr-closer`       |
| CI / build                  | `ci-autofixer`, `qa-validator`, `pr-closer`                               |
| Release / deploy            | `preflight-release-guard`, `pr-closer`                                    |
| Docs-only                   | `docs-runbook-keeper`, `pr-auditor`, `pr-closer`                          |
| Instruções de agentes       | `pr-auditor`, `docs-runbook-keeper`, `pr-closer`                          |

---

## Agent Workflows

### Core Rules — sempre ativas

Localização: `.github/instructions/`

* `condstore-core.instructions.md` — estado real, sem suposição, fechamento de escopo.
* `security-core.instructions.md` — tenant isolation, auth, PII.
* `delivery-standard.instructions.md` — checks antes de concluir, drift, métricas.
* `mvp-freeze.instructions.md` — guardrails de escopo MVP e superfícies frozen.

### Orquestração

Localização: `.github/agents/`

* `agent-orchestrator.agent.md` — coordena múltiplos agentes.
* `task-decomposer.agent.md` — quebra frentes em tarefas executáveis.
* `explorer-agent.agent.md` — mapeia codebase real antes de execução.

### Produto e Arquitetura

* `product-lead.agent.md` — discovery, PRD, backlog, priorização.
* `solution-architect.agent.md` — decisões arquiteturais completas.

### Domínio CONDSTORE

* `atendimento-specialist.agent.md` — WhatsApp, Twilio, pipeline de conversação.
* `freight-flow-specialist.agent.md` — cotação multicarrier, circuit breaker, pedido.
* `frank-supervisor.agent.md` — IA supervisionada, tool-guard, gateway LLM.
* `cockpit-validator.agent.md` — painéis, filas, métricas, consistência.
* `database-architect.agent.md` — schema, migrations, índices, drift.

### Implementação

* `feature-shipper.agent.md` — feature completa ponta a ponta.
* `backend-specialist.agent.md` — API, regras de negócio, integrações.
* `frontend-specialist.agent.md` — UI/UX, componentes, estados.
* `mobile-developer.agent.md` — iOS, Android, React Native.
* `seo-specialist.agent.md` — SEO técnico, metadata, indexação.

### Qualidade e Validação

* `qa-validator.agent.md` — testes funcionais reais via browser e API.
* `qa-automation-engineer.agent.md` — automação E2E e integração no CI.
* `test-generator.agent.md` — unit/integration tests.
* `integration-flow-runner.agent.md` — fluxo ponta a ponta em ambiente real.
* `browser-automation-agent.agent.md` — validação visual via browser.

### PR e Release

* `preflight-release-guard.agent.md` — pré-fechamento, merge conflicts, blockers.
* `pr-auditor.agent.md` — auditoria técnica da PR.
* `pr-closer.agent.md` — fechamento final no GitHub.

### Investigação e Manutenção

* `debugger.agent.md` — causa raiz com evidência.
* `code-archaeologist.agent.md` — legado, dívida técnica, refatoração segura.
* `data-consistency-enforcer.agent.md` — drift e inconsistência banco/código.
* `performance-optimizer.agent.md` — gargalos mensuráveis.
* `ci-autofixer.agent.md` — falhas de CI com patch mínimo.
* `devops-automator.agent.md` — CI/CD, deploy, variáveis de ambiente.

### Segurança

* `security-auditor.agent.md` — auth, PII, rotas críticas.
* `penetration-tester.agent.md` — testes ofensivos controlados.
* `tenant-isolation-auditor.agent.md` — vazamento entre tenants.

### Documentação

* `docs-runbook-keeper.agent.md` — documentação técnica, runbooks e padrões.

---

## Como Usar Workflows

### Tarefa simples

1. Ler este `AGENTS.md`.
2. Ler as Core Rules em `.github/instructions/`.
3. Ler o workflow correspondente em `.github/agents/`.
4. Executar respeitando MVP Freeze, tenant isolation, LGPD e delivery standard.
5. Registrar evidência objetiva.

### Frente complexa

1. Acionar `explorer-agent`.
2. Acionar `task-decomposer`.
3. Acionar `agent-orchestrator`.
4. Executar com agente especializado.
5. Acionar gates obrigatórios por risco.
6. Acionar `pr-auditor`.
7. Acionar `pr-closer`.

### Em caso de conflito

Precedência:

`AGENTS.md > .github/instructions/* > .github/agents/* > tarefa/PR`

---

## Rastreabilidade

Toda frente relevante deve registrar:

* objetivo;
* escopo;
* fora de escopo;
* branch;
* PR;
* head SHA;
* agentes acionados;
* arquivos alterados;
* comandos executados;
* testes/gates;
* blockers;
* decisão final;
* merge commit, se houver.

Decisão técnica relevante deve ser registrada em ADR ou documentação equivalente.

---

## Status Final Permitido

Cada agente deve usar apenas os status definidos no seu workflow.

Na ausência de status específico, usar:

* `CONCLUÍDO`
* `NÃO CONCLUÍDO`
* `BLOQUEADO`
* `AGUARDANDO APROVAÇÃO HUMANA`

Nunca usar:

* “quase”
* “aparentemente”
* “provavelmente”
* “deve estar ok”
* “sem problemas visíveis”

---

## Regra Final

O CONDSTORE OS é um sistema operacional multi-tenant em MVP supervisionado.

Prioridade absoluta:

1. Segurança.
2. Tenant isolation.
3. LGPD/PII.
4. Escopo MVP.
5. Fluxo operacional real.
6. CI e rastreabilidade.
7. UX e polish.

Nenhuma entrega pode sacrificar os itens 1 a 6 para ganhar velocidade.
