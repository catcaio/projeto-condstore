# Relatório de Auditoria: Equipe de Agentes CONDSTORE

> **Versão:** 1.0  
> **Data:** 2026-03-31  
> **Escopo:** `.agents/rules/` (3 arquivos) + `.agents/workflows/` (31 arquivos)  
> **Objetivo:** Diagnosticar o estado atual dos agentes e propor uma equipe enxuta e focada no CONDSTORE OS

---

## 1. Diagnóstico Geral

**Estado base antes desta PR:** o repositório possuía **31 workflows** e **3 regras sempre-ativas**, mas o `AGENTS.md` oficial referenciava apenas **5 workflows**. Isso significa que 26 agentes existiam no repositório sem rastreabilidade formal, sem garantia de que seguiam o MVP freeze, e sem posicionamento claro na cadeia de execução. Esta PR corrige esse estado.

### Inventário atual

| Categoria | Agentes |
|---|---|
| **Regras sempre-ativas** | `condstore-core`, `security-core`, `delivery-standard` |
| **Entrega de feature** | `feature-shipper`, `backend-specialist`, `frontend-specialist`, `task-decomposer`, `agent-orchestrator` |
| **Qualidade e CI** | `qa-validator`, `qa-automation-engineer`, `test-generator`, `integration-flow-runner`, `ci-autofixer` |
| **PR e release** | `pr-auditor`, `pre-PR`, `preflight-release-guard`, `pr-closer` |
| **Investigação** | `debugger`, `explorer-agent`, `code-archaeologist`, `performance-optimizer` |
| **Dados** | `database-architect`, `data-consistency-enforcer` |
| **Segurança** | `security-auditor`, `penetration-tester` |
| **Produto** | `product-manager`, `product-owner`, `solution-architect` |
| **Documentação** | `documentation-writer`, `docs-runbook-keeper` |
| **Fora do contexto CONDSTORE** | `mobile-developer`, `seo-specialist` |
| **Uso condicional (infra/CI)** | `devops-automator` |

---

## 2. Problemas Identificados

### 2.1 Agentes duplicados ou sobrepostos

**`pre-PR.md` e `preflight-release-guard.md`**  
São o mesmo agente. O `preflight-release-guard.md` é a versão mais completa (inclui verificação de `mergeable` no GitHub, resolução de conflitos, checklist de 10 itens). O `pre-PR.md` é uma versão anterior incompleta. Manter os dois gera confusão sobre qual chamar.

> **Impacto:** Risco de uso da versão incompleta com gaps no processo de PR.

**`documentation-writer.md` e `docs-runbook-keeper.md`**  
Objetivos praticamente idênticos: criar/atualizar documentação técnica e runbooks. A diferença é marginal (o `docs-runbook-keeper` enfatiza runbooks operacionais). Na prática, um agente invocará o outro ou ambos serão usados de forma inconsistente.

> **Impacto:** Documentação duplicada, padrões divergentes, desperdício de contexto.

**`product-manager.md` e `product-owner.md`**  
Sobreposição significativa de responsabilidades. O `product-manager` foca em discovery e user stories. O `product-owner` foca em backlog e priorização. No CONDSTORE, com equipe pequena e MVP definido, dois agentes de produto geram ambiguidade sobre qual usar para cada situação.

> **Impacto:** Decisões de produto sem agente claro de responsabilidade.

### 2.2 Agentes fora do escopo do produto

**`mobile-developer.md`**  
O CONDSTORE OS é uma aplicação **Next.js 16 web-only**. Não existe código React Native, iOS ou Android no repositório. Este agente não tem superfície de atuação real no projeto atual.

> **Impacto:** Agente inativo ocupando espaço na equipe sem contribuição.

**`seo-specialist.md`**  
O CONDSTORE é um SaaS B2B com área autenticada para operadores. O público (distribuidores atacadistas, 2-20 operadores) não chega via busca orgânica. A superfície pública é mínima (landing page de conversão). SEO não é vetor de aquisição prioritário no MVP.

> **Impacto:** Agente de baixo ROI para o estágio atual do produto. Risco de otimizar área errada.

**`devops-automator.md`** *(avaliado — mantido com uso condicional)*
O deploy do CONDSTORE é gerenciado pela Vercel (Next.js). O CI está no `.github/workflows/ci.yml`. A infraestrutura é mínima e reproduzível. Um agente de DevOps genérico pode conflitar com decisões de infra já tomadas ou expandir escopo para além do necessário.

> **Decisão:** Mantido no repositório com uso condicional — entra apenas em falhas de CI de origem de infra ou mudanças explícitas de pipeline. Não é acionado em features de produto.

### 2.3 Agentes sem contexto do MVP freeze

A maioria dos 31 workflows **não menciona MVP freeze**, `guardrail:mvp-freeze` ou as superfícies congeladas (`Frank runtime/training`, `DOMINE Console`, `knowledge/RAG`). Um agente executando sem esse contexto pode entregar código em áreas frozen sem perceber.

> **Impacto:** Violação silenciosa do MVP freeze. Risco real de escopo creep em produção.

### 2.4 Agentes ausentes do AGENTS.md oficial

O `AGENTS.md` lista apenas 5 workflows (`backend-specialist`, `integration-flow-runner`, `debugger`, `pr-auditor`, `feature-shipper`). Os outros 26 existem no repositório mas não têm rastreabilidade oficial. Isso significa:

- Sem hierarquia clara de quando usar cada um
- Sem garantia de que seguem as regras do `AGENTS.md`
- Sem visibilidade para novos membros da equipe

### 2.5 Ausência de agentes especializados no core do CONDSTORE

Os módulos centrais do produto — **atendimento WhatsApp**, **Frank/AI supervisionado**, **cotação de frete**, **cockpit operacional** — não têm agentes dedicados. Qualquer trabalho nessas áreas é feito pelo `backend-specialist` ou `frontend-specialist` genéricos, sem guardrails específicos do domínio.

> **Impacto:** Erros de domínio passam sem detecção. Por exemplo: Frank em modo autônomo sem verificar `FRANK_RUNTIME_MODE`, atendimento sem verificar assinatura Twilio, cotação sem validar timeout dos adaptadores de frete.

### 2.6 Inconsistência de formato entre agentes

Comparando `pr-auditor.md` com `backend-specialist.md`:

- `pr-auditor.md`: descrição de 3 palavras (`"auditar pr"`), sem objetivo estruturado, sem seção de regras obrigatórias formatada
- `backend-specialist.md`: descrição completa, objetivo, regras obrigatórias, fluxo de execução, formato de resposta, critério de status

Essa inconsistência reduz a previsibilidade do comportamento dos agentes.

---

## 3. Proposta: Equipe Reestruturada

### 3.1 Regras sempre-ativas (manter + expandir)

As 3 regras existentes são sólidas. Proposta de adição:

```
.agents/rules/mvp-freeze.md     ← NOVO: guardrails de escopo MVP para todos os agentes
```

**Conteúdo proposto para `mvp-freeze.md`:**
- Superfícies frozen: Frank runtime/training, DOMINE Console, knowledge/RAG, playbooks autorais
- Obrigatório: rodar `npm run guardrail:mvp-freeze` antes de PR em superfícies de produto
- Nunca expandir escopo para áreas frozen sem justificativa explícita
- Se tocar dependência frozen, preservar costura existente

### 3.2 Agentes removidos

| Agente | Motivo |
|---|---|
| `pre-PR.md` | Duplicata inferior do `preflight-release-guard.md`. |
| `documentation-writer.md` | Duplicata do `docs-runbook-keeper.md`. |

### 3.2b Agentes avaliados e mantidos por decisão

| Agente | Avaliação | Decisão |
|---|---|---|
| `mobile-developer.md` | Sem superfície no projeto atual (web-only). | **Mantido** — reservado para expansão futura mobile. |
| `seo-specialist.md` | Aquisição B2B não é via busca orgânica no MVP. | **Mantido** — ativo para landing page e superfícies públicas. |

### 3.3 Agentes a consolidar

| De | Para | Ação |
|---|---|---|
| `product-manager.md` + `product-owner.md` | `product-lead.md` | Unificar: discovery + priorização + PRD em um único agente com modos de operação claros |

### 3.4 Novos agentes especializados no CONDSTORE

#### `atendimento-specialist.md` (NOVO — CRÍTICO)

**Por que:** O módulo `atendimento` é o ponto de entrada de tudo no CONDSTORE (WhatsApp inbound via Twilio). Qualquer falha aqui para a operação do cliente. Requer guardrails específicos: validação de assinatura Twilio, idempotência de webhook, isolamento de tenant, pipeline de conversação.

**Responsabilidades:**
- Implementar e validar fluxos de inbound WhatsApp
- Garantir validação de assinatura Twilio em todo webhook
- Validar idempotência de mensagens recebidas
- Garantir correto roteamento para pipeline de atendimento
- Validar que Frank nunca envia mensagem sem aprovação do operador (modo supervisionado)
- Verificar isolamento de conversas por tenant

**Status:** `FUNCIONAL` ou `NÃO FUNCIONAL`

---

#### `freight-flow-specialist.md` (NOVO — CRÍTICO)

**Por que:** A cotação de frete é o diferencial central do produto ("de 15 minutos para <30 segundos"). O módulo envolve paralelismo de adaptadores (Melhor Envio, Movvi, Mengue, Braspress), circuit breaker, timeout, cache e lógica de ranking. Erros aqui afetam diretamente o operador.

**Responsabilidades:**
- Implementar e validar fluxos de cotação multicarrier
- Garantir paralelismo correto entre adaptadores
- Validar circuit breaker e timeout por carrier
- Garantir que resultado de cotação persiste corretamente para conversão em pedido
- Validar fluxo cotação → aprovação → pedido
- Verificar auditoria de cotações por tenant

**Status:** `FUNCIONAL` ou `NÃO FUNCIONAL`

---

#### `frank-supervisor.md` (NOVO — ALTO RISCO)

**Por que:** Frank é o módulo de AI supervisionada. É a área de maior risco de comportamento inesperado no CONDSTORE. Qualquer agente trabalhando em Frank sem contexto específico pode: ligar modo autônomo sem querer, bypassar o `tool-guard`, criar sugestões que vão direto para o WhatsApp sem aprovação do operador.

**Responsabilidades:**
- Implementar e validar funcionalidades Frank sempre em modo supervisionado
- Verificar que `FRANK_RUNTIME_MODE` está configurado corretamente
- Garantir que `tool-guard.ts` está ativo em todos os fluxos
- Nunca implementar envio automático de mensagem sem aprovação do operador
- Validar PII redaction no gateway LLM
- Verificar limites de token, rate limits e telemetria
- Garantir que sugestões Frank são exibidas no cockpit para aprovação

**Status:** `SUPERVISIONADO` ou `RISCO_DE_AUTONOMIA`

---

#### `cockpit-validator.md` (NOVO — MÉDIO)

**Por que:** O cockpit é a superfície principal do operador e do gestor. Agrega dados de atendimento, frete, pedidos e métricas. Erros aqui são visíveis imediatamente pelo usuário final. Atualmente não há agente específico para validar consistência entre os dados das filas, painéis e alertas.

**Responsabilidades:**
- Validar que dados do cockpit refletem estado real do banco
- Verificar consistência de métricas por tenant
- Garantir que filas operacionais (atendimento, pedidos, frete) estão corretas
- Validar alertas e shortcuts do cockpit
- Cruzar dados persistidos vs dados exibidos

**Status:** `CONSISTENTE` ou `INCONSISTENTE`

---

#### `tenant-isolation-auditor.md` (NOVO — SEGURANÇA)

**Por que:** O CONDSTORE é multi-tenant. A regra mais crítica do sistema é que `tenantId` e `userId` vêm exclusivamente da sessão, nunca de query/body. Atualmente o `security-auditor` cobre isso de forma genérica. Um agente dedicado focado exclusivamente em vazamento de dados entre tenants é necessário dado o risco.

**Responsabilidades:**
- Auditar todas as rotas em busca de `tenantId` vindo de fonte insegura
- Verificar filtros por tenant em todos os repositórios
- Validar que webhook handlers (Twilio, Stripe) não aceitam `tenantId` do payload
- Testar acesso cruzado entre tenants em endpoints críticos
- Verificar isolamento de dados no cockpit, atendimento, frete e pedidos

**Status:** `ISOLADO` ou `VAZAMENTO_DETECTADO`

---

### 3.5 Agentes a atualizar com contexto CONDSTORE

Os seguintes agentes são válidos mas precisam receber contexto do MVP freeze em seu cabeçalho:

| Agente | Adição necessária |
|---|---|
| `backend-specialist.md` | Referência ao guardrail MVP freeze antes de qualquer PR em superfícies de produto |
| `feature-shipper.md` | Verificação obrigatória de `npm run guardrail:mvp-freeze` no checklist de DONE |
| `database-architect.md` | Alerta para não expandir schema em módulos frozen (Frank knowledge, DOMINE Console) |
| `solution-architect.md` | Alerta para alinhar com boundaries do MVP antes de propor arquitetura |
| `pr-auditor.md` | Reformatar com estrutura padrão (objetivo, regras, fluxo, status) |
| `agent-orchestrator.md` | Adicionar ao `AGENTS.md` oficial como ponto de entrada para frentes complexas |

---

## 4. Mapa da Equipe Proposta

```
REGRAS SEMPRE-ATIVAS (4)
├── condstore-core.md          ← estado real, sem suposição
├── security-core.md           ← tenant isolation, auth, PII
├── delivery-standard.md       ← checks antes de concluir
└── mvp-freeze.md [NOVO]       ← guardrails de escopo MVP

ENTRADA E ORQUESTRAÇÃO (3)
├── agent-orchestrator.md      ← frentes complexas multi-agente
├── task-decomposer.md         ← quebrar frentes em tarefas
└── explorer-agent.md          ← leitura e mapeamento do codebase

PRODUTO (1, consolidado)
└── product-lead.md [CONSOLIDADO de product-manager + product-owner]

ARQUITETURA (1)
└── solution-architect.md

DOMÍNIO CONDSTORE (5, sendo 4 novos)
├── atendimento-specialist.md  [NOVO — WhatsApp, Twilio, pipeline]
├── freight-flow-specialist.md [NOVO — cotação multicarrier, circuit breaker]
├── frank-supervisor.md        [NOVO — AI supervisionada, tool-guard, LLM gateway]
├── cockpit-validator.md       [NOVO — painéis, filas, métricas, consistência]
└── database-architect.md      ← schema, migrations, índices

IMPLEMENTAÇÃO (3)
├── feature-shipper.md         ← feature completa ponta a ponta
├── backend-specialist.md      ← API, regras, integrações
└── frontend-specialist.md     ← UI/UX, componentes, estados

QUALIDADE E VALIDAÇÃO (5)
├── qa-validator.md            ← testes funcionais reais
├── qa-automation-engineer.md  ← automação E2E e CI
├── test-generator.md          ← unit e integration tests
├── integration-flow-runner.md ← fluxo real ponta a ponta
└── browser-automation-agent.md ← validação visual via browser

PR E RELEASE (3)
├── preflight-release-guard.md ← pré-fechamento, blockers, merge conflicts
├── pr-auditor.md              ← auditoria completa da PR
└── pr-closer.md               ← fechamento final no GitHub

INVESTIGAÇÃO E MANUTENÇÃO (5)
├── debugger.md                ← causa raiz com evidência
├── code-archaeologist.md      ← legado, dívida técnica
├── data-consistency-enforcer.md ← drift, inconsistência de dados
├── performance-optimizer.md   ← gargalos mensuráveis
└── ci-autofixer.md            ← falhas de CI com patch mínimo

SEGURANÇA (3)
├── security-auditor.md        ← auth, PII, rotas críticas
├── penetration-tester.md      ← testes ofensivos controlados
└── tenant-isolation-auditor.md [NOVO — vazamento entre tenants]

DOCUMENTAÇÃO (1, consolidado)
└── docs-runbook-keeper.md     [absorve documentation-writer]

REMOVIDOS (2)
├── pre-PR.md                  ← duplicata do preflight-release-guard
└── documentation-writer.md    ← duplicata do docs-runbook-keeper

MANTIDOS POR DECISÃO (2)
├── mobile-developer.md        ← reservado para expansão futura mobile
└── seo-specialist.md          ← ativo para landing page e superfícies públicas
```

**Resultado:** de 31 workflows → **33 ativos** (incluindo 6 novos), com 2 removidos e 2 consolidações (product-lead absorveu product-manager + product-owner; docs-runbook-keeper absorveu documentation-writer).

---

## 5. Atualização do AGENTS.md

O `AGENTS.md` precisa ser expandido para listar todos os agentes disponíveis. Atualmente referencia apenas 5. Proposta de estrutura:

```markdown
## Agent Workflows

### Core Rules (sempre-ativas)
- .agents/rules/condstore-core.md
- .agents/rules/delivery-standard.md
- .agents/rules/security-core.md
- .agents/rules/mvp-freeze.md [NOVO]

### Orquestração
- .agents/workflows/agent-orchestrator.md
- .agents/workflows/task-decomposer.md
- .agents/workflows/explorer-agent.md

### Produto e Arquitetura
- .agents/workflows/product-lead.md [consolidado]
- .agents/workflows/solution-architect.md

### Domínio CONDSTORE
- .agents/workflows/atendimento-specialist.md [NOVO]
- .agents/workflows/freight-flow-specialist.md [NOVO]
- .agents/workflows/frank-supervisor.md [NOVO]
- .agents/workflows/cockpit-validator.md [NOVO]
- .agents/workflows/database-architect.md

### Implementação
- .agents/workflows/feature-shipper.md
- .agents/workflows/backend-specialist.md
- .agents/workflows/frontend-specialist.md

### Qualidade
- .agents/workflows/qa-validator.md
- .agents/workflows/qa-automation-engineer.md
- .agents/workflows/test-generator.md
- .agents/workflows/integration-flow-runner.md
- .agents/workflows/browser-automation-agent.md

### PR e Release
- .agents/workflows/preflight-release-guard.md
- .agents/workflows/pr-auditor.md
- .agents/workflows/pr-closer.md

### Investigação e Manutenção
- .agents/workflows/debugger.md
- .agents/workflows/code-archaeologist.md
- .agents/workflows/data-consistency-enforcer.md
- .agents/workflows/performance-optimizer.md
- .agents/workflows/ci-autofixer.md

### Segurança
- .agents/workflows/security-auditor.md
- .agents/workflows/penetration-tester.md
- .agents/workflows/tenant-isolation-auditor.md [NOVO]

### Documentação
- .agents/workflows/docs-runbook-keeper.md
```

---

## 6. Priorização de Implementação

| Prioridade | Ação | Motivo |
|---|---|---|
| **P0** | Criar `mvp-freeze.md` como regra sempre-ativa | Todos os agentes operam sem essa guardrail hoje. Risco imediato. |
| **P0** | Criar `frank-supervisor.md` | Frank é área de maior risco. Qualquer agente pode ligar modo autônomo por engano. |
| **P1** | Criar `atendimento-specialist.md` | Módulo crítico do MVP sem agente dedicado. |
| **P1** | Criar `freight-flow-specialist.md` | Core diferencial do produto sem agente dedicado. |
| **P1** | Remover `pre-PR.md` | Eliminar confusão com `preflight-release-guard.md`. |
| **P1** | `mobile-developer.md` e `seo-specialist.md` avaliados | Mantidos por decisão — mobile para expansão futura; seo para landing page. |
| **P2** | Criar `tenant-isolation-auditor.md` | Multi-tenant é invariante de segurança crítico. |
| **P2** | Criar `cockpit-validator.md` | Superfície principal do operador sem validação dedicada. |
| **P2** | Atualizar `AGENTS.md` com todos os agentes | Rastreabilidade e onboarding. |
| **P3** | Consolidar `product-manager` + `product-owner` | Reduzir ambiguidade de produto. |
| **P3** | Padronizar formato do `pr-auditor.md` | Consistência com outros agentes. |
| **P3** | Consolidar `documentation-writer` + `docs-runbook-keeper` | Eliminar duplicata. |
| **P3** | Adicionar referência ao MVP freeze nos agentes de entrega | `feature-shipper`, `backend-specialist`, `database-architect`. |

---

## 7. Resumo Executivo

| Dimensão | Estado Atual | Estado Proposto |
|---|---|---|
| Total de agentes | 31 workflows + 3 regras | 33 workflows + 4 regras (37 total rastreáveis) |
| Agentes no AGENTS.md | 5 | 37 (todos rastreáveis) |
| Agentes com guardrail MVP freeze | 0 | 4+ (via regra sempre-ativa) |
| Agentes especializados em domínio CONDSTORE | 0 | 5 (atendimento, frete, frank, cockpit, tenant) |
| Duplicatas ativas | 4 | 0 |
| Agentes removidos | — | 2 (pre-PR, documentation-writer) |
| Agentes mantidos por decisão | — | 2 (mobile-developer, seo-specialist) |
| Cobertura dos módulos críticos | Parcial | Completa |

O gap mais crítico é a ausência de agentes especializados nos módulos centrais do produto (atendimento, frete, Frank) e a ausência de guardrails de MVP freeze em todos os agentes. Uma equipe de agentes bem estruturada para o CONDSTORE deve refletir o produto real, não um kit genérico adaptado superficialmente.
