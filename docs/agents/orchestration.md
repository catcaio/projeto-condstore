# CONDSTORE — Sistema de Orquestração de Agentes

> **Documento central e executável.** Toda tarefa no repositório deve começar aqui.
> Versão: 1.2 | Atualizado em: 2026-03-30 | Escopo: CONDSTORE Quotes MVP

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Classificação de Tasks](#2-classificação-de-tasks)
   - [Níveis: SMALL / MEDIUM / LARGE](#21-níveis-de-classificação)
   - [Mapeamento para Pipelines](#22-mapeamento-para-pipelines)
   - [Agentes por Nível](#23-agentes-por-nível-de-classificação)
   - [MEDIUM vs LARGE — Comparativo](#24-medium-vs-large--diferenças-determinísticas)
3. [Regras Sempre-Ativas](#3-regras-sempre-ativas)
4. [Camadas de Agentes](#4-camadas-de-agentes)
5. [Tabela de Referência Rápida](#5-tabela-de-referência-rápida)
6. [Agent-Orchestrator — Quando Usar](#6-agent-orchestrator--quando-usar)
7. [Pipelines Oficiais](#7-pipelines-oficiais)
   - [Feature Development (LARGE)](#71-feature-development-pipeline--large-)
   - [Medium Change / Bug Fix (MEDIUM)](#72-medium-change-pipeline--medium-)
   - [CI Failure](#73-ci-failure-pipeline)
   - [Small Change / Small Fix (SMALL)](#74-small-change--small-fix-pipeline--small-)
8. [Regras de Dependência e Bloqueio](#8-regras-de-dependência-e-bloqueio)
9. [Agentes Condicionais — Gatilhos de Entrada](#9-agentes-condicionais--gatilhos-de-entrada)
10. [Integração com MVP CONDSTORE Quotes](#10-integração-com-mvp-condstore-quotes)
11. [Separação: feature-shipper vs pr-closer](#11-separação-feature-shipper-vs-pr-closer)
12. [Anti-Padrões](#12-anti-padrões)
13. [Sobreposições Resolvidas](#13-sobreposições-resolvidas)

---

## 1. Visão Geral

Este repositório opera com **31 agentes especializados** organizados em camadas funcionais. Cada agente tem responsabilidade única, critérios de entrada definidos e saída verificável.

**Princípio central:** nenhuma tarefa começa sem saber qual agente entra primeiro, quais são condicionais, e quem valida antes do merge.

```
Produto → Arquitetura → Implementação → Qualidade → Entrega → Documentação
```

**O primeiro passo de qualquer tarefa é classificá-la** (§2). A classificação determina qual pipeline usar, quais agentes são obrigatórios, e o nível de rigor necessário.

Tarefas cross-layer ou com múltiplos frentes paralelas exigem `agent-orchestrator` (§6).

---

## 2. Classificação de Tasks

> **Classifique antes de agir.** A classificação determina o pipeline, os agentes obrigatórios e o nível de rigor. Uma task mal classificada desperdiça agentes desnecessários ou ignora riscos reais.

### 2.1 Níveis de Classificação

#### 🟢 SMALL — Mudança localizada, baixo risco

Mudança contida em área conhecida, sem impacto em fluxo, lógica de negócio ou contrato de sistema.

**Exemplos:**
- Ajuste de texto, label ou mensagem de UI
- Correção de estilo/CSS localizado
- Renomeação de variável interna
- Fix de teste quebrado sem alterar lógica
- Ajuste de configuração não-crítica
- Correção de typo em documentação

**Critérios de identificação:**
- Escopo: 1–3 arquivos
- Sem mudança de contrato de API ou schema
- Sem impacto em auth, tenant, ou fluxo crítico
- Reversível sem consequência

---

#### 🟡 MEDIUM — Mudança com impacto em fluxo ou lógica

Mudança que altera comportamento observável, fluxo existente ou regra de negócio, mas dentro de um domínio delimitado.

**Exemplos:**
- Alteração de endpoint existente (nova validação, mudança de resposta)
- Ajuste de regra de negócio em serviço existente
- Mudança em fluxo de UI existente (sem nova feature)
- Bug em fluxo crítico que exige análise estruturada
- Refactoring com mudança de comportamento observável
- Ajuste em query ou índice sem migração de schema

**Critérios de identificação:**
- Escopo: múltiplos arquivos, domínio único
- Pode alterar resposta de API ou comportamento de componente
- Requer validação funcional (não apenas smoke test)
- Não exige decisão arquitetural nova

**Agentes proibidos por padrão em MEDIUM** (só entram após escalada para LARGE):

| Agente | Motivo da proibição |
|--------|---------------------|
| `product-manager` | MEDIUM tem escopo e requisito já conhecidos |
| `solution-architect` | MEDIUM não exige decisão arquitetural nova |
| `task-decomposer` | MEDIUM é linear — não há frentes paralelas |
| `agent-orchestrator` | MEDIUM é executado por agente único ou dupla simples |
| `feature-shipper` | Exclusivo de LARGE — empacota features completas |

**Gatilhos de escalada obrigatória MEDIUM → LARGE:**

Se durante a execução de uma task MEDIUM qualquer um dos seguintes for identificado, **pare e reclassifique como LARGE antes de continuar**:

```
ESCALAR SE:
  ✦ impacto cross-layer inesperado (backend + frontend + DB simultaneamente)
  ✦ mudança em contrato externo (formato de request/response de API pública)
  ✦ impacto em isolamento de tenant ou auth
  ✦ necessidade de migração de schema (não apenas ajuste de query)
  ✦ decisão arquitetural nova necessária
  ✦ mais de 1 domínio afetado
  ✦ mudança toca qualquer superfície MVP core
```

> ⚠️ **Nunca continue em MEDIUM com um gatilho de escalada ativo.** Reclassificar primeiro é parte do processo, não opcional.

---

#### 🔴 LARGE — Mudança estrutural ou nova feature

Mudança que cria novo comportamento no sistema, impacta múltiplos domínios, envolve decisão arquitetural, ou toca superfícies críticas de segurança/tenant.

**Exemplos:**
- Nova feature completa (novo fluxo, nova tela, novo serviço)
- Mudança de arquitetura ou padrão de integração
- Alteração com impacto em múltiplos domínios
- Mudança em isolamento de tenant ou auth
- Nova migração de schema com impacto em dados existentes
- Qualquer mudança nas superfícies MVP core

**Critérios de identificação:**
- Escopo: cross-layer ou cross-domain
- Cria novo comportamento que não existia
- Exige decisão arquitetural ou validação de segurança obrigatória
- Risco de regressão em múltiplas áreas

---

### 2.2 Mapeamento para Pipelines

| Classificação | Pipeline | Número de etapas | Notas |
|--------------|----------|-----------------|-------|
| 🟢 **SMALL** | [Small Change / Small Fix](#74-small-change--small-fix-pipeline--small-) | 5 etapas | `explorer-agent` opcional se área óbvia |
| 🟡 **MEDIUM** | [Medium Change Pipeline](#72-medium-change-pipeline--medium-) | 7 etapas | Sem product-manager, solution-architect, agent-orchestrator, feature-shipper |
| 🔴 **LARGE** | [Feature Development Pipeline](#71-feature-development-pipeline--large-) | 14 etapas | Pipeline completo com todas as camadas |

> ⚠️ **Nem toda feature precisa passar por todas as 14 etapas.**
> Use classificação **LARGE** somente quando os critérios acima forem satisfeitos.
> Uma feature bem delimitada em domínio único pode ser **MEDIUM** e usar o pipeline de 7 etapas.

**Regra de escalada:** Em caso de dúvida entre SMALL e MEDIUM, classifique como MEDIUM.
Em caso de dúvida entre MEDIUM e LARGE, classifique como LARGE. Nunca escale para baixo por conveniência.

---

### 2.4 MEDIUM vs LARGE — Diferenças Determinísticas

Use esta tabela quando a classificação entre MEDIUM e LARGE não for imediatamente óbvia.

| Critério | 🟡 MEDIUM | 🔴 LARGE |
|----------|----------|---------|
| **Escopo** | 1 domínio, múltiplos arquivos | Múltiplos domínios ou cross-layer |
| **Comportamento** | Altera comportamento existente | Cria comportamento novo |
| **Arquitetura** | Não muda — segue padrão existente | Pode requerer decisão arquitetural |
| **Coordenação** | Linear — um agente por vez | Multiagente — frentes paralelas |
| **Orquestrador** | ❌ não usar | ✅ obrigatório se frentes paralelas |
| **Schema/migração** | Apenas ajuste de query/índice | Migração de schema com impacto em dados |
| **Auth / tenant** | Sem impacto | Pode tocar — exige security-auditor |
| **Contrato externo** | Contrato inalterado | Pode alterar request/response público |
| **Documentação** | Pós-merge se necessário | Pré-PR obrigatória se contrato mudou |
| **PR audit** | Opcional (apenas se crítico) | Obrigatório |
| **Agentes de produto** | ❌ não usar | ✅ obrigatório |
| **feature-shipper** | ❌ não usar | ✅ obrigatório |
| **Tempo típico** | Horas | Dias / sprint |

> Se **2 ou mais critérios da coluna LARGE** forem verdadeiros → reclassifique como LARGE imediatamente.

---

### 2.3 Agentes por Nível de Classificação

Tabela de obrigatoriedade por tamanho de task. Leia como: o agente **deve** / **pode** / **não deve** ser usado neste nível.

| Agente | 🟢 SMALL | 🟡 MEDIUM | 🔴 LARGE |
|--------|---------|---------|---------|
| `product-manager` | ❌ não usar | ❌ não usar¹ | ✅ obrigatório |
| `product-owner` | ❌ não usar | ❌ não usar¹ | ✅ obrigatório |
| `explorer-agent` | ⚪ opcional (área conhecida) | ✅ obrigatório | ✅ obrigatório |
| `solution-architect` | ❌ não usar | ❌ não usar¹ | ✅ obrigatório |
| `task-decomposer` | ❌ não usar | ❌ não usar¹ | ✅ obrigatório (frentes paralelas) |
| `backend-specialist` | ⚪ se necessário | ✅ se backend envolvido | ✅ se backend envolvido |
| `database-architect` | ❌ não usar | ⚪ se query/índice envolvido | ✅ se schema/migração envolvido |
| `frontend-specialist` | ⚪ se necessário | ✅ se UI envolvida | ✅ se UI envolvida |
| `mobile-developer` | ⚪ se necessário | ✅ se mobile envolvido | ✅ se mobile envolvido |
| `devops-automator` | ❌ não usar | ⚪ se CI/env envolvido | ⚪ se infra envolvida |
| `data-consistency-enforcer` | ❌ não usar | ⚪ se query/modelo envolvido | ✅ se há migração ou mudança de modelo |
| `qa-validator` | ✅ obrigatório | ✅ obrigatório | ✅ obrigatório |
| `integration-flow-runner` | ❌ não usar | ⚪ se fluxo E2E afetado | ✅ obrigatório (MVP core) |
| `browser-automation-agent` | ❌ não usar | ⚪ se UI complexa afetada | ⚪ se validação visual necessária |
| `test-generator` | ❌ não usar | ⚪ se gap de cobertura identificado | ⚪ após nova feature |
| `qa-automation-engineer` | ❌ não usar | ❌ não usar | ⚪ para fluxos críticos sem automação |
| `security-auditor` | ❌ não usar | ⚪ condicional (ver §9) | ✅ obrigatório (MVP core e auth/tenant) |
| `penetration-tester` | ❌ não usar | ❌ não usar | ⚪ pré go-live ou nova superfície pública |
| `performance-optimizer` | ❌ não usar | ⚪ se degradação evidenciada | ⚪ se carga prevista alta |
| `debugger` | ⚪ se bug | ✅ se bug MEDIUM | ⚪ se bug dentro de feature |
| `ci-autofixer` | ⚪ se CI quebrou | ✅ se CI quebrou | ⚪ se CI quebrou |
| `code-archaeologist` | ❌ não usar | ⚪ se área legada envolvida | ⚪ antes de refactoring de risco |
| `feature-shipper` | ❌ não usar | ❌ não usar | ✅ obrigatório |
| `preflight-release-guard` | ✅ obrigatório | ✅ obrigatório | ✅ obrigatório |
| `pr-auditor` | ❌ não usar (salvo MVP core) | ⚪ obrigatório se bug crítico | ✅ obrigatório |
| `pr-closer` | ✅ obrigatório | ✅ obrigatório | ✅ obrigatório |
| `documentation-writer` | ❌ não usar | ⚪ se novo contrato/fluxo criado | ✅ se contrato operacional mudou |
| `docs-runbook-keeper` | ❌ não usar | ⚪ pós-merge se necessário | ✅ obrigatório se comportamento operacional mudou |
| `agent-orchestrator` | ❌ não usar | ❌ não usar¹ | ✅ obrigatório (frentes paralelas) |
| `seo-specialist` | ❌ não usar | ❌ não usar | ⚪ se página pública/aquisição afetada |

**Legenda:**
- ✅ obrigatório — deve entrar
- ⚪ opcional / condicional — entra se critério específico for satisfeito
- ❌ não usar — não pertence a este nível (anti-padrão usá-lo aqui)
- ¹ proibido por padrão em MEDIUM — só entra após escalada para LARGE (ver §2.1)

---

## 3. Regras Sempre-Ativas

As três regras abaixo aplicam-se **automaticamente a todos os agentes**, em todas as tarefas, sem exceção:

| Arquivo | Propósito |
|---------|-----------|
| `.agents/rules/condstore-core.md` | Princípios de execução: operar sobre estado real, mapear impacto em todas as camadas, nunca concluir com suposição |
| `.agents/rules/delivery-standard.md` | Padrão de entrega: validar antes de concluir, considerar impacto em métricas/cockpit, nunca marcar completo sem evidência real |
| `.agents/rules/security-core.md` | Segurança: nunca confiar em tenantId/userId do request, validar auth/permissões/isolamento em toda rota crítica |

---

## 4. Camadas de Agentes

### Camada 1 — Estratégia / Produto
Entra apenas em tasks **LARGE** com impacto no escopo ou direção do produto.
**Não usar em SMALL, MEDIUM sem implicação estratégica, ou bugfix.**

| Agente | Papel |
|--------|-------|
| `product-manager` | Transforma ideias brutas em especificação executável (discovery, requisitos, critérios de aceite) |
| `product-owner` | Organiza backlog, prioriza, confirma que tarefa está dentro do escopo MVP |

---

### Camada 2 — Arquitetura & Descoberta
Obrigatório em **MEDIUM** e **LARGE**. Opcional em **SMALL** quando área é completamente conhecida.

| Agente | Papel |
|--------|-------|
| `explorer-agent` | Mapeia estado real do codebase, zonas de impacto, padrões existentes. **Obrigatório em MEDIUM e LARGE.** |
| `solution-architect` | Define abordagem técnica, mapeia impactos entre camadas, toma decisões arquiteturais. **Apenas LARGE ou MEDIUM com impacto cross-layer.** |
| `task-decomposer` | Quebra escopo em blocos executáveis com dependências e critérios de aceite. Usar quando há múltiplas frentes ou incerteza de ordem. |

---

### Camada 3 — Implementação
Agentes de execução. Entram após arquitetura definida.

| Agente | Papel |
|--------|-------|
| `backend-specialist` | APIs, lógica de negócio, integrações, serviços |
| `database-architect` | Schema, migrações, queries, índices, integridade referencial |
| `frontend-specialist` | Web UI, componentes, fluxos, integração com APIs |
| `mobile-developer` | Apps mobile iOS/Android/React Native *(ver gatilho em §9)* |
| `devops-automator` | CI/CD, infra, variáveis de ambiente, pipeline *(ver gatilho em §9)* |

---

### Camada 4 — Qualidade
Entra após implementação. Valida antes da entrega.

| Agente | Papel |
|--------|-------|
| `qa-validator` | Testes funcionais reais (UI + API + DB). Resultado: APROVADO ou REJEITADO. **Obrigatório em todos os níveis.** |
| `integration-flow-runner` | Validação E2E de fluxo completo, ponta a ponta |
| `browser-automation-agent` | Validação real via browser como usuário *(ver gatilho em §9)* |
| `data-consistency-enforcer` | Audita alinhamento schema/DB/código. Obrigatório quando há migração ou mudança de modelo |
| `test-generator` | Gera testes unitários e de integração para cobertura de gaps |
| `qa-automation-engineer` | Cria suites E2E e integra ao CI. Para fluxos críticos recorrentes |

---

### Camada 5 — Segurança & Performance
Condicional por nível. Ver obrigatoriedade em §9.

| Agente | Papel |
|--------|-------|
| `security-auditor` | Audita auth, isolamento de tenant, exposição de dados *(ver obrigatoriedade em §9)* |
| `penetration-tester` | Testes ofensivos controlados *(ver gatilho em §9)* |
| `performance-optimizer` | Identifica e resolve gargalos reais com métricas antes/depois *(ver gatilho em §9)* |

---

### Camada 6 — Debugging & Investigação
Entra sob demanda, não está no fluxo padrão de feature.

| Agente | Papel |
|--------|-------|
| `debugger` | Reprodução sistemática de bugs, análise de causa raiz, fix mínimo |
| `ci-autofixer` | Detecta e resolve falhas de CI com evidência concreta |
| `code-archaeologist` | Mapeia áreas legadas, acoplemamentos, débito técnico e fronteiras seguras de refatoração *(ver gatilho em §9)* |

---

### Camada 7 — Entrega & PR
Execução sequencial obrigatória. Nenhuma etapa pode ser pulada.

| Agente | Papel |
|--------|-------|
| `feature-shipper` | Consolida implementação completa, empacota PR limpa e verificada. **Apenas LARGE.** |
| `preflight-release-guard` | Valida mergeabilidade real no GitHub, conflitos, CI, blockers automatizáveis. **Todos os níveis.** |
| `pr-auditor` | Auditoria completa: diff, segurança, testes, CI, consistência, regressões. **LARGE obrigatório; MEDIUM condicional.** |
| `pr-closer` | Gate final de produção: mergeia somente quando mergeable=TRUE + CI verde + sem blockers. **Todos os níveis.** |

> ⚠️ `pre-PR` é alias de `preflight-release-guard`. Usar sempre `preflight-release-guard`.

---

### Camada 8 — Documentação & Operações
Documentação deve chegar ao PR **antes do preflight** quando a mudança altera comportamento operacional.

| Agente | Papel |
|--------|-------|
| `documentation-writer` | **Cria** documentação nova: contratos de API, novos fluxos, setup, guias, playbooks |
| `docs-runbook-keeper` | **Mantém e consolida** documentação existente: runbooks, README, padrões, decisões operacionais |

**Regra de acionamento de documentação:**

```
SE mudança altera: comportamento operacional, runbook, rota crítica,
                    contrato de API, fluxo de cotação, aprovação,
                    métricas do cockpit, autenticação, permissões
→ documentation-writer ou docs-runbook-keeper atua ANTES do preflight-release-guard
→ Doc atualizada deve constar no mesmo PR

SE mudança é interna, refactoring sem impacto externo, ou fix técnico isolado
→ docs-runbook-keeper atua APÓS merge como consolidador
```

---

### Meta-Camada — Orquestração

| Agente | Papel |
|--------|-------|
| `agent-orchestrator` | Coordena execução multiagente, gerencia dependências, paraleliza trabalho, consolida resultados |

> Regras de uso definidas em detalhes na §6.

---

### Especialistas Pontuais

| Agente | Papel |
|--------|-------|
| `seo-specialist` | Otimização de busca orgânica para páginas públicas *(ver gatilho em §9)* |

---

## 5. Tabela de Referência Rápida

| Agente | Trigger de Entrada | Obrigatório em | Condicional em |
|--------|-------------------|----------------|----------------|
| `product-manager` | Nova feature LARGE / ideia sem spec | LARGE | — |
| `product-owner` | Dúvida de prioridade / escopo MVP | LARGE | MEDIUM (escopo incerto) |
| `explorer-agent` | Qualquer mudança MEDIUM ou LARGE | MEDIUM, LARGE | SMALL (área desconhecida) |
| `solution-architect` | Mudança cross-layer / decisão de arquitetura | LARGE | MEDIUM cross-layer |
| `task-decomposer` | Múltiplas frentes / incerteza de ordem | LARGE (paralelo) | MEDIUM complexo |
| `backend-specialist` | Mudança em API, serviço, lógica de negócio | Feature + bug com backend | — |
| `database-architect` | Mudança em schema, migração, query crítica | LARGE com migração | MEDIUM com query |
| `frontend-specialist` | Mudança em UI, componente, fluxo web | Feature com UI | — |
| `mobile-developer` | Mudança em app mobile | Toda mudança mobile | — |
| `devops-automator` | Falha de infra / mudança de CI / env inconsistente | CI Failure (se infra) | LARGE com infra |
| `data-consistency-enforcer` | Migração ou mudança de modelo de dados | LARGE com migração | MEDIUM com query |
| `qa-validator` | Após qualquer implementação | **Todos os níveis** | — |
| `integration-flow-runner` | Mudança que afeta fluxo E2E | LARGE MVP core | MEDIUM com integração |
| `browser-automation-agent` | Validação visual/comportamental de UI complexa | — | LARGE com UI crítica |
| `test-generator` | Gap de cobertura identificado | — | LARGE sem testes |
| `qa-automation-engineer` | Fluxo crítico sem automação ou suite frágil | — | LARGE recorrente |
| `security-auditor` | Mudança em auth/tenant/dados sensíveis/MVP core | LARGE MVP core | MEDIUM com risco |
| `penetration-tester` | Antes de go-live / após mudança crítica de auth | — | LARGE pré go-live |
| `performance-optimizer` | Degradação identificada / carga prevista alta | — | LARGE com evidência |
| `debugger` | Bug reproduzível com comportamento inesperado | Bug Fix MEDIUM/LARGE | SMALL simples |
| `ci-autofixer` | Falha de CI sem causa óbvia | CI Failure pipeline | — |
| `code-archaeologist` | Refactoring de área legada / entender código antigo | — | LARGE legado |
| `feature-shipper` | Implementação LARGE completa, pronta para PR | LARGE | — |
| `preflight-release-guard` | Antes de todo PR | **Todos os níveis** | — |
| `pr-auditor` | Após preflight em LARGE e bugs críticos | LARGE | MEDIUM crítico |
| `pr-closer` | Após pr-auditor (LARGE) ou preflight (SMALL/MEDIUM) | **Todos os níveis** | — |
| `documentation-writer` | Nova documentação a criar | LARGE com novo contrato | MEDIUM com novo fluxo |
| `docs-runbook-keeper` | Atualização de doc existente | LARGE com impacto operacional | MEDIUM pós-merge |
| `agent-orchestrator` | LARGE com frentes paralelas / cross-layer | LARGE multiagente | MEDIUM com 3+ agentes |
| `seo-specialist` | Mudança em páginas públicas com objetivo de ranqueamento | — | LARGE página pública |

---

## 6. Agent-Orchestrator — Quando Usar

### Obrigatório quando (sempre LARGE):
- Tarefa envolve **3 ou mais agentes de camadas diferentes** operando em paralelo
- Existem **dependências cruzadas não-triviais** entre frentes simultâneas
- A tarefa é de **escopo de sprint / épico** (múltiplos blocos de trabalho)
- Há risco real de **conflito de decisão** entre agentes (ex: backend e frontend tomando decisões divergentes sobre contrato de API)
- Orquestração de **frentes paralelas** (ex: backend + frontend + migração simultâneos)

### Opcional (MEDIUM com complexidade):
- Tarefa MEDIUM com 2–3 agentes e dependências não-óbvias
- Feature pequena com dependências lineares claras — pode dispensar

### Nunca usar em (SMALL e bugfix simples):
- Tarefa é um bugfix isolado
- Small change em arquivo único
- Agente único consegue resolver sem dependência de outros

### Formato de entrada do agent-orchestrator:
```
Objetivo → Classificação (LARGE) → Agentes necessários → Blocos de execução → Dependências → Resultado esperado
```

---

## 7. Pipelines Oficiais

> **Como escolher:** classifique a task em §2 antes de escolher o pipeline.

---

### 7.1 Feature Development Pipeline — LARGE —

Para features novas ou mudanças estruturais com impacto real no produto. Use apenas para tasks classificadas como **LARGE**.

```
┌─────────────────────────────────────────────────────────────┐
│  ESTRATÉGIA                                                 │
│  1. product-manager     → spec, requisitos, critérios       │
│  2. product-owner       → prioridade, escopo MVP confirmado │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ARQUITETURA                                                │
│  3. explorer-agent      → mapeamento de impacto no código   │
│  4. solution-architect  → decisão técnica + impactos        │
│  5. task-decomposer     → blocos de execução + deps         │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  IMPLEMENTAÇÃO (paralelo quando possível)                   │
│  6a. backend-specialist   → APIs, lógica, integrações       │
│  6b. frontend-specialist  → UI, componentes, fluxos         │
│  6c. database-architect   → schema, migrações (se aplicável)│
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  QUALIDADE                                                  │
│  7.  data-consistency-enforcer → valida alinhamento DB      │
│  8a. qa-validator              → testes funcionais          │
│  8b. integration-flow-runner   → validação E2E              │
│  9.  security-auditor          → se surface MVP core        │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  DOCUMENTAÇÃO (pré-PR se mudança operacional)               │
│  10. documentation-writer / docs-runbook-keeper             │
│      → obrigatório antes do preflight se contrato mudou     │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ENTREGA                                                    │
│  11. feature-shipper          → empacota PR limpa           │
│  12. preflight-release-guard  → valida mergeabilidade real  │
│  13. pr-auditor               → auditoria completa do PR    │
│  14. pr-closer                → gate final, executa merge   │
└─────────────────────────────────────────────────────────────┘
```

**Regra de paralelização:**
Passos 6a/6b/6c podem rodar em paralelo — acione `agent-orchestrator` para coordenar.
Passos 8a/8b podem rodar em paralelo após 7.

> ⚠️ **Nem toda feature usa as 14 etapas.** Passos condicionais (6c, 7, 8b, 9, 10) só entram se os critérios específicos forem satisfeitos. Uma feature LARGE sem mudança de schema pula 6c e 7.

**Resultado REJECTED em qualquer etapa** → retorna para o agente responsável por corrigir antes de avançar.

---

### 7.2 Medium Change Pipeline — MEDIUM —

Para qualquer task classificada como **MEDIUM**: mudança de endpoint, ajuste de regra de negócio, bug estruturado, refactoring com impacto observável, ou ajuste de fluxo existente. Pipeline linear — sem paralelismo, sem orquestrador, sem agentes de produto.

#### Pipeline canônico (7 etapas)

```
┌─────────────────────────────────────────────────────────────┐
│  DESCOBERTA                                                 │
│  1. explorer-agent      → mapeia área afetada, impacto,     │
│                           padrões e dependências locais     │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  IMPLEMENTAÇÃO                                              │
│  2. [especialista]      → executa mudança no domínio        │
│     backend-specialist  → se endpoint/serviço/lógica        │
│     frontend-specialist → se fluxo de UI                   │
│     debugger            → se causa raiz de bug              │
│     database-architect  → se query/índice (sem migração)    │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  DADOS (condicional)                                        │
│  3. data-consistency-enforcer                               │
│     → SOMENTE se mudança afeta query, modelo ou DB          │
│     → PULAR se mudança é puramente lógica/UI                │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  QUALIDADE                                                  │
│  4. qa-validator        → testes funcionais (obrigatório)   │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  SEGURANÇA (condicional)                                    │
│  5. security-auditor                                        │
│     → SOMENTE se mudança toca: auth, permissões,            │
│       dados de cliente, endpoint com dados sensíveis        │
│     → PULAR se mudança não toca essas áreas                 │
└────────────────────────────┬────────────────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  ENTREGA                                                    │
│  6. preflight-release-guard → valida mergeabilidade real    │
│  7. pr-closer               → gate final, executa merge     │
└─────────────────────────────────────────────────────────────┘
```

#### Regras fixas para MEDIUM

```
OBRIGATÓRIO em todos os casos:
  ✅ explorer-agent (passo 1)
  ✅ qa-validator   (passo 4)
  ✅ preflight-release-guard (passo 6)
  ✅ pr-closer      (passo 7)

CONDICIONAL — entra somente se critério for satisfeito:
  ⚪ data-consistency-enforcer → mudança afeta DB/query/modelo
  ⚪ security-auditor          → mudança toca auth/dados sensíveis

PROIBIDO por padrão em MEDIUM:
  ❌ product-manager
  ❌ product-owner
  ❌ solution-architect
  ❌ task-decomposer
  ❌ agent-orchestrator
  ❌ feature-shipper
  ❌ pr-auditor  (entra apenas se: bug crítico em MVP core
                  ou security-auditor retornar risco alto)
```

#### Variantes de execução

**Variante A — Bug Fix:**
```
explorer-agent → debugger → [data-consistency-enforcer] →
qa-validator → [security-auditor] → preflight → pr-closer
```

**Variante B — Mudança de Lógica / Endpoint:**
```
explorer-agent → backend-specialist → [data-consistency-enforcer] →
qa-validator → [security-auditor] → preflight → pr-closer
```

**Variante C — Ajuste de Fluxo UI:**
```
explorer-agent → frontend-specialist →
qa-validator → preflight → pr-closer
```

> Escolha a variante pelo tipo de mudança. Se duas variantes se aplicam simultaneamente (ex: backend + UI no mesmo domínio) — verifique os gatilhos de escalada. Se ainda for MEDIUM, execute em sequência linear (não em paralelo).

#### Gatilhos de escalada durante execução MEDIUM

Se qualquer um dos seguintes for detectado **durante** a execução, **pare imediatamente e reclassifique como LARGE**:

| Sinal | Ação |
|-------|------|
| Impacto identificado em 2+ domínios | → LARGE |
| Necessidade de migração de schema | → LARGE |
| Decisão arquitetural nova necessária | → LARGE |
| Contrato externo de API precisa mudar | → LARGE |
| Auth ou isolamento de tenant afetado | → LARGE |
| Qualquer superfície MVP core envolvida | → LARGE |

> Reclassificar não é falha — é parte do processo. Melhor escalar cedo do que descobrir no preflight.

---

### 7.3 CI Failure Pipeline

Para falhas de CI sem causa imediatamente óbvia. Sem classificação de tamanho — é reativo.

```
1. ci-autofixer              → detecta, reproduz, identifica causa raiz
2. [backend/frontend/db]     → corrige se necessário (escopo mínimo)
3. qa-validator              → confirma sem regressão
4. preflight-release-guard   → valida mergeabilidade
5. pr-closer                 → merge
```

> Não passar por camada de Produto ou Arquitetura.
> Escopo máximo: correção da falha de CI sem alterar comportamento funcional.

---

### 7.4 Small Change / Small Fix Pipeline — SMALL —

Para tasks **SMALL**: texto, estilo, config, refactoring localizado, ajuste de variável, fix de teste isolado.

```
1. explorer-agent            → confirma escopo e identifica impacto
2. [agente especialista]     → executa mudança (backend/frontend/etc)
3. qa-validator              → valida que nada quebrou
4. preflight-release-guard   → valida mergeabilidade
5. pr-closer                 → merge
```

> Sem `product-manager`, `product-owner`, `solution-architect`, `task-decomposer`.
> Sem `pr-auditor` (a menos que mudança toque surface MVP core → reclassifique como MEDIUM/LARGE).
> Sem `feature-shipper` (PR é criada diretamente pelo especialista).
> `explorer-agent` pode ser omitido somente se escopo é **arquivo único e impacto é 100% óbvio**.
> Se durante a execução o escopo crescer → **reclassifique** antes de continuar.

---

## 8. Regras de Dependência e Bloqueio

```
product-manager         ──→ deve completar antes de solution-architect (LARGE)
product-owner           ──→ deve confirmar escopo antes de qualquer implementação (LARGE)
explorer-agent          ──→ deve mapear antes de qualquer implementação MEDIUM/LARGE
solution-architect      ──→ deve decidir antes de backend/frontend iniciarem (LARGE)
database-architect      ──→ deve completar migração antes de backend-specialist (se há schema change)
data-consistency-enforcer ─→ deve validar (CONSISTENT) antes de qa-validator aprovar (MEDIUM/LARGE)
qa-validator            ──→ deve retornar APPROVED antes de feature-shipper concluir (LARGE)
security-auditor        ──→ deve completar antes de preflight-release-guard (MVP core / LARGE)
docs (operacionais)     ──→ devem ser atualizados antes de preflight-release-guard (se contrato mudou)
preflight-release-guard ──→ deve retornar READY antes de pr-auditor executar
pr-auditor              ──→ deve retornar DONE antes de pr-closer mergear (LARGE)
pr-closer               ──→ merge somente com mergeable=TRUE + CI verde + sem blockers
```

**Qualquer resultado REJECTED / BLOCKED / INCONSISTENT / NON-FUNCTIONAL** interrompe o pipeline e retorna para o agente responsável.

---

## 9. Agentes Condicionais — Gatilhos de Entrada

### `agent-orchestrator`
- **Nível:** LARGE obrigatório; MEDIUM condicional
- **Entra quando:** tarefa tem 3+ agentes em camadas diferentes, frentes paralelas com dependências cruzadas, ou risco de decisão conflitante
- **Acionado por:** solicitação inicial da tarefa (antes dos demais agentes)
- **Fluxo:** Meta-camada — acima de todos os outros

### `browser-automation-agent`
- **Nível:** LARGE condicional
- **Entra quando:** validação de UI exige interação como usuário real (não apenas checar HTML); fluxos com múltiplos estados (loading, erro, sucesso, vazio); regressão visual crítica
- **Acionado por:** `qa-validator` ou `integration-flow-runner` quando teste manual não é suficiente
- **Fluxo:** Camada 4 — após implementação frontend

### `penetration-tester`
- **Nível:** LARGE condicional (pré go-live ou nova superfície pública)
- **Entra quando:** mudança crítica em auth, permissões ou isolamento de tenant; antes de go-live em produção; após exposição de nova superfície pública
- **Acionado por:** `security-auditor` (escala para pentest quando vulnerabilidade suspeita) ou por solicitação explícita pré go-live
- **Fluxo:** Camada 5 — após security-auditor

### `performance-optimizer`
- **Nível:** MEDIUM/LARGE condicional (somente com evidência)
- **Entra quando:** degradação de performance identificada com evidência (logs, métricas); carga esperada alta em novo fluxo; query ou endpoint com latência acima do SLA
- **Acionado por:** `qa-validator` (identifica degradação) ou monitoramento de produção
- **Fluxo:** Camada 5 — após qa-validator evidenciar problema

### `mobile-developer`
- **Nível:** Qualquer nível se escopo inclui mobile
- **Entra quando:** tarefa envolve app mobile (iOS/Android/React Native)
- **Acionado por:** task-decomposer (quando escopo inclui mobile) ou diretamente na Camada 3
- **Fluxo:** Camada 3 — paralelo com backend/frontend quando aplicável

### `devops-automator`
- **Nível:** CI Failure pipeline; LARGE condicional
- **Entra quando:** falha ou inconsistência de infra/CI; nova variável de ambiente necessária; mudança de pipeline; novo serviço a configurar; ambiente de staging/prod desalinhado
- **Acionado por:** `ci-autofixer` (quando falha é de infra) ou solicitação explícita de mudança de pipeline
- **Fluxo:** Camada 3 — paralelo com implementação ou no CI Failure pipeline

### `code-archaeologist`
- **Nível:** LARGE condicional (área legada)
- **Entra quando:** tarefa exige modificar área legada, pouco documentada ou com alto acoplamento desconhecido; antes de refactoring de risco; quando comportamento atual é incerto
- **Acionado por:** `solution-architect` (quando área é legada) ou `debugger` (quando causa raiz está em código antigo)
- **Fluxo:** Camada 6 — antes de implementação em área de risco

### `seo-specialist`
- **Nível:** LARGE condicional (páginas públicas)
- **Entra quando:** mudança em páginas públicas com objetivo de ranqueamento orgânico; landing pages; página de cotação pública; conteúdo indexável
- **Acionado por:** `product-manager` (quando objetivo inclui aquisição orgânica) ou solicitação explícita
- **Fluxo:** Especialista pontual — após frontend-specialist, antes de preflight

### `security-auditor` — Obrigatoriedade por Nível
```
OBRIGATÓRIO (LARGE ou qualquer nível nas condições abaixo):
  - qualquer mudança em autenticação ou autorização
  - qualquer mudança em isolamento de tenant
  - qualquer nova rota que acesse dados sensíveis
  - todas as superfícies MVP core (cockpit, cotação, aprovação, WhatsApp, CRM)
  - antes de go-live

CONDICIONAL (MEDIUM com risco identificado):
  - mudança em endpoint que acessa dados de cliente
  - alteração em fluxo de permissão existente

NÃO USAR (SMALL e MEDIUM de baixo risco):
  - mudanças internas sem exposição de dados
  - refactoring de UI sem impacto em auth
  - ajustes de config sem acesso a dados sensíveis
```

---

## 10. Integração com MVP CONDSTORE Quotes

### Superfícies MVP Core (imutável — per AGENTS.md)
- **Cockpit operacional** — métricas, visibilidade de frota, KPIs
- **Fluxo de cotação** — criação, cálculo, envio de cotação de frete
- **Aprovação operador** — fluxo de aprovação/rejeição de cotação
- **Supervisão WhatsApp** — atendimento, histórico, status
- **CRM** — cadastro e gestão de clientes

> ⚠️ Qualquer mudança em superfície MVP core é automaticamente **LARGE**, independente do tamanho aparente da mudança.

### Regras obrigatórias para MVP Core

1. **`product-owner` confirma escopo** antes de qualquer implementação — nenhuma expansão para áreas congeladas (Frank runtime, RAG, DOMINE Console, playbooks)
2. **`security-auditor` é obrigatório** — isolamento de tenant é crítico em todas as superfícies
3. **`data-consistency-enforcer` é obrigatório** — métricas do cockpit dependem de dados limpos
4. **`preflight-release-guard` executa** `npm run guardrail:mvp-freeze` antes de abrir PR
5. **Documentação operacional atualizada antes do preflight** se mudança afeta cockpit, cotação ou aprovação
6. **`integration-flow-runner` é obrigatório** — fluxo de cotação deve ser validado E2E

### Mapa de agentes por superfície MVP

| Superfície | Classificação | Agentes Obrigatórios | Agentes Condicionais |
|------------|--------------|---------------------|---------------------|
| Cockpit (métricas) | LARGE | `data-consistency-enforcer`, `security-auditor`, `qa-validator` | `performance-optimizer` (se carga alta) |
| Fluxo de cotação | LARGE | `backend-specialist`, `qa-validator`, `integration-flow-runner`, `security-auditor` | `frontend-specialist`, `browser-automation-agent` |
| Aprovação operador | LARGE | `backend-specialist`, `security-auditor`, `qa-validator` | `frontend-specialist` |
| WhatsApp supervision | LARGE | `backend-specialist`, `security-auditor`, `integration-flow-runner` | — |
| CRM | LARGE | `backend-specialist`, `qa-validator`, `security-auditor` | `frontend-specialist` |

---

## 11. Separação: feature-shipper vs pr-closer

São responsabilidades distintas e **não intercambiáveis**. `feature-shipper` existe apenas no pipeline LARGE.

### `feature-shipper` — apenas LARGE
- **O quê:** Consolida a implementação completa de uma feature
- **Faz:** Verifica que backend + frontend + testes + migração estão completos; garante typecheck ok; cria PR limpa e bem descrita
- **Não faz:** Não valida mergeabilidade no GitHub; não executa merge; não audita PR completa
- **Entrega:** PR criada e pronta para validação

### `pr-closer` — todos os níveis
- **O quê:** Gate final de produção
- **Faz:** Valida estado real no GitHub (não apenas local); confirma mergeable=TRUE; confirma CI verde; confirma sem blockers; executa merge
- **Não faz:** Não corrige código; não reescreve PR description; não age como implementador
- **Entrega:** Merge executado ou lista completa de blockers que impedem merge

**Regra anti-overlap:**
`feature-shipper` nunca mergeia.
`pr-closer` nunca implementa.
Se `pr-closer` encontrar problema de código → retorna para o agente implementador, não corrige sozinho.

---

## 12. Anti-Padrões

### ❌ Nunca fazer

**1. Iniciar implementação MEDIUM/LARGE sem `explorer-agent`**
```
❌ backend-specialist → implementa direto (MEDIUM/LARGE)
✅ explorer-agent → mapeia impacto → backend-specialist → implementa
```

**2. Classificar task como SMALL para escapar do pipeline correto**
```
❌ "é só um ajuste no endpoint" → Small Fix Pipeline → sem security-auditor
✅ ajuste em endpoint que acessa dados → MEDIUM → Bug Fix Pipeline
```

**3. Chamar múltiplos agentes da mesma camada para decidir a mesma coisa sem orquestração**
```
❌ backend-specialist + solution-architect decidindo contrato de API separadamente
✅ solution-architect decide → backend-specialist implementa
```

**4. Rodar `pr-closer` sem `preflight-release-guard`**
```
❌ implementação → pr-closer
✅ implementação → preflight-release-guard → [pr-auditor] → pr-closer
```

**5. Usar `documentation-writer` para manutenção de docs existentes**
```
❌ documentation-writer atualiza runbook existente
✅ docs-runbook-keeper atualiza runbook existente
   documentation-writer cria doc nova
```

**6. Usar `solution-architect` para mudanças triviais (SMALL)**
```
❌ solution-architect decide como renomear uma variável
✅ backend-specialist renomeia diretamente (SMALL → Small Fix Pipeline)
```

**7. Usar `product-manager` ou `product-owner` em bugfix técnico**
```
❌ product-manager analisa bug de null pointer
✅ explorer-agent → debugger → qa-validator → pr-closer
```

**8. Deixar documentação operacional para pós-merge quando contrato mudou**
```
❌ implementar nova rota → merge → atualizar docs depois
✅ implementar nova rota → documentation-writer (antes do preflight) → merge com doc no PR
```

**9. Usar `pr-auditor` sem `preflight-release-guard` ter passado**
```
❌ pr-auditor em PR com conflito de merge
✅ preflight-release-guard resolve conflitos → pr-auditor audita PR limpa
```

**10. Marcar tarefa como concluída com resultado REJECTED/BLOCKED**
```
❌ qa-validator retorna REJECTED → feature-shipper empacota mesmo assim
✅ qa-validator retorna REJECTED → volta para implementador → revalidação → APPROVED → avança
```

**11. Expandir para áreas congeladas sem autorização explícita**
```
❌ adicionar Frank runtime em PR de cotação
✅ product-owner confirma escopo → ALLOW_FROZEN_SURFACE_CHANGES=1 com justificativa documentada
```

**12. Usar `agent-orchestrator` em tasks SMALL ou bugfix simples**
```
❌ agent-orchestrator coordena renomeação de variável
✅ backend-specialist age direto (SMALL → Small Fix Pipeline)
```

**13. Ignorar gatilho de escalada e continuar em MEDIUM**
```
❌ explorou o código, viu impacto cross-layer → continuou no Medium Pipeline
✅ explorou o código, viu impacto cross-layer → parou, reclassificou para LARGE → iniciou Feature Pipeline
```

**14. Paralelizar agentes em MEDIUM sem escalar para LARGE**
```
❌ backend-specialist + frontend-specialist em paralelo (MEDIUM)
✅ reclassificar para LARGE → agent-orchestrator coordena paralelismo
   OU executar em sequência linear mantendo MEDIUM
```

---

## 13. Sobreposições Resolvidas

| Conflito | Resolução Oficial |
|----------|------------------|
| `pre-PR` vs `preflight-release-guard` | `pre-PR` é alias obsoleto. Usar sempre `preflight-release-guard` |
| `documentation-writer` vs `docs-runbook-keeper` | `documentation-writer` cria; `docs-runbook-keeper` mantém e consolida |
| `test-generator` vs `qa-automation-engineer` | `test-generator` gera código de testes unit/integration; `qa-automation-engineer` constrói suites E2E e integra ao CI |
| `product-manager` vs `product-owner` | `product-manager` faz discovery e spec; `product-owner` prioriza backlog e confirma escopo MVP |
| `security-auditor` vs `penetration-tester` | `security-auditor` faz auditoria de código/configuração; `penetration-tester` faz testes ofensivos controlados (escalonado do auditor ou pré go-live) |
| `feature-shipper` vs `pr-closer` | `feature-shipper` empacota implementação (apenas LARGE); `pr-closer` executa merge (todos os níveis) — ver §11 |
| Bug Fix vs Feature MEDIUM | Bug Fix Pipeline (7 etapas) serve para ambos os casos MEDIUM — bugs e features menores sem impacto estratégico |

---

*Este documento é a fonte de verdade para orquestração de agentes no repositório CONDSTORE.*
*Toda divergência entre este documento e práticas observadas deve ser reportada e resolvida aqui.*
