# CONDSTORE OS — Auditoria Técnica Pós-Merge (main)

> **Data:** 2026-03-12  
> **Escopo:** Segurança multi-tenant · Frank supervisionado · Playbooks/Intent · Cockpit UX · Performance · Event Bus · Higiene do repositório  
> **Status:** Relatório final + correções aplicadas

---

## 1. MULTI-TENANT / SEGURANÇA

### ✅ Isolamento correto (sem ação necessária)

| Arquivo | Observação |
|---|---|
| `src/modules/frank/intents/intent.repository.ts` | Todas as queries filtram por `tenantId` |
| `src/modules/frank/playbooks/playbook.repository.ts` | Todas as operações incluem `tenantId` |
| `src/modules/frank/suggestions/suggestion.repository.ts` | Filtra corretamente por `tenantId` |
| `src/modules/frank/memory/memory.repository.ts` | Filtra por `tenantId` |
| `src/modules/frank/intent-linker/intent-linker.repository.ts` | Filtra por `tenantId` |
| Todos os routes em `/api/cockpit/**` | Protegidos com `requireAdmin` — tenantId sempre derivado da sessão |

### 🟠 CORRIGIDO — tenantId via query param em rota do cockpit

| Arquivo | Linha | Problema | Risco | Status |
|---|---|---|---|---|
| `src/app/api/cockpit/metrics/frank/route.ts` | 73–79 | Rota aceitava `?tenantId=xxx` e retornava 403 se diferente do da sessão, criando vetor de enumeração de tenants válidos | Médio — fingerprinting de tenants | **Corrigido**: bloco `requestedTenantId` removido; apenas `auth.session.tenantId` é usado |

### ℹ️ Routes internas com tenantId por query param (comportamento intencional)

As rotas abaixo usam `requireInternalToken` (token de serviço, não sessão de usuário) e por isso recebem `tenantId` via query param — o que é o design correto para operações de CI/CD, workers e exportações:

- `src/app/api/internal/frank/metrics/route.ts`
- `src/app/api/internal/frank/gate/route.ts`
- `src/app/api/internal/rag/stats/route.ts`
- `src/app/api/internal/exports/frank-events/route.ts`

---

## 2. FRANK / MODO SUPERVISIONADO

### ✅ Salvaguardas robustas — sem ação crítica

| Arquivo | Observação |
|---|---|
| `src/modules/frank/conversation-control.ts` | Intents sensíveis (CONFIRM_ORDER, PAYMENT, CONFIRM_QUOTE, COMPLAINT, PRICE_NEGOTIATION) sempre supervisionados |
| `src/modules/frank/conversation-control.ts` | Confiança mínima de 0.8 para autonomia; horário comercial (08–18 BRT) força supervisão |
| `src/modules/frank/conversation-control.ts` | Limite de 5 respostas autônomas consecutivas antes de forçar handoff |
| `src/modules/frank/conversation-control.ts` | Detecção de frustração (14+ palavras-chave) → força supervisão |
| `src/core/ai/frank-event-sanitize.ts` | Sanitização de PII nos payloads de LLM: remove phones (E.164 + BR), emails, API keys, URL de banco |
| Env `FRANK_RUNTIME_MODE=SUPERVISED_ONLY` | Bloqueia toda autonomia globalmente |

### 🟢 Payloads de eventos sem PII

Os payloads emitidos pelos serviços de intent e suggestions **não contêm texto raw das mensagens**:

- `intent.events.ts`: emite `{ intentId, sessionId, conversationId, messageId, detectedIntent, confidence }` — sem `messageText`
- `suggestion.events.ts`: emite `{ suggestionId, sessionId, conversationId, intent, confidence }` — sem `suggestedResponse`
- `intent-linker.events.ts`: payloads tipados sem texto do usuário

### 🟡 Ressalva — tipagem `any` nos eventos de intent/suggestion

| Arquivo | Problema | Impacto | Correção sugerida |
|---|---|---|---|
| `src/modules/frank/intents/intent.events.ts` | Parâmetro `payload: any` nas funções exportadas | Médio — permite passagem acidental de campos PII no futuro | Substituir `any` por interfaces tipadas explícitas (`IntentCapturedPayload`, etc.) |
| `src/modules/frank/suggestions/suggestion.events.ts` | Parâmetro `payload: any` | Médio — mesma razão | Substituir por `SuggestionGeneratedPayload`, etc. |

---

## 3. PLAYBOOKS / INTENT LEARNING / LINKER

### ✅ Fluxo consistente

| Arquivo | Observação |
|---|---|
| `src/modules/frank/intent-linker/intent-linker.service.ts` | Fluxo validate → link-playbook / create-playbook funcionando |
| `src/modules/frank/intent-linker/intent-linker.repository.ts` | `playbookId` e `linkStatus` persistidos corretamente |
| `src/modules/frank/playbooks/playbook.repository.ts` | Queries sempre filtradas por `tenantId` |

### 🟡 Ressalvas menores

| Arquivo | Problema | Impacto | Correção sugerida |
|---|---|---|---|
| `src/modules/frank/intents/intent.events.ts` | `payload: any` — tipo não enforçado | Médio | Tipar explicitamente os payloads de evento |
| `src/modules/frank/suggestions/suggestion.events.ts` | `payload: any` | Médio | Tipar explicitamente |
| Validação de `title`/`responseBase` nos playbooks | Sem limite de tamanho enforçado na API | Baixo — risco de payload enorme | Adicionar validação de tamanho máximo (ex: 2000 chars) |

---

## 4. COCKPIT / UX OPERACIONAL

### Atritos encontrados

| Rota | Atrito | Melhoria sugerida | Prioridade |
|---|---|---|---|
| `/cockpit/atendimento` | Conversas e mensagens em polls separados (15s / 8s), gerando ~300 req/min com 10 usuários | **CORRIGIDO**: intervalos aumentados para 30s cada | Alta |
| `/cockpit/atendimento` | Frank suggestion panel também fazia poll a cada 8s por conversa ativa | **CORRIGIDO**: intervalo aumentado para 30s | Alta |
| `/cockpit/frank` | Cards informativos sem ação rápida associada | Adicionar ações contextuais nos cards de sugestão | Média |
| `/cockpit/pipeline` | Sem drag-and-drop de estágios | Implementar kanban drag-drop (Pipedrive-like) | Média |
| `/cockpit/orders` | Pedidos e cotações são visualmente separados, mas operacionalmente o mesmo fluxo | Unificar em timeline única por cliente | Alta |
| `/cockpit/timeline` | Feed sem limite visível de registros | Adicionar paginação virtual (ver seção 5) | Média |
| Geral — Cockpit | Ausência de atalhos de teclado | Adicionar shortcuts para ações frequentes | Baixa |

---

## 5. PERFORMANCE

### 🔴 CORRIGIDO — Polling excessivo no Atendimento

| Arquivo | Linha | Problema | Impacto | Status |
|---|---|---|---|---|
| `src/app/(app)/cockpit/atendimento/atendimento.client.tsx` | 79 | Poll de conversas a cada 15s | 10 usuários = 40 req/min só neste endpoint | **Corrigido**: 30s |
| `src/app/(app)/cockpit/atendimento/atendimento.client.tsx` | 86 | Poll de mensagens a cada 8s | 10 usuários = 75 req/min | **Corrigido**: 30s |
| `src/app/(app)/cockpit/atendimento/components/frank-suggestion-panel.tsx` | 51 | Poll de sugestões a cada 8s | 10 usuários ativos = 75 req/min adicionais | **Corrigido**: 30s |

### 🟡 Pendentes (roadmap imediato)

| Arquivo | Problema | Impacto | Correção sugerida |
|---|---|---|---|
| `src/app/(app)/cockpit/atendimento/atendimento.client.tsx` | Sem AbortController no poll de conversas e mensagens | Leve — memory leak em desmontagem rápida | Adicionar AbortController como feito em `cockpit-metrics.tsx` |
| `src/ui/timeline/timeline-feed.tsx` | Feed sem limite de registros visíveis | Médio — DOM cresce sem controle | Implementar virtualização (react-virtual) ou paginação |
| `src/app/api/knowledge/collections/route.ts` | Retorna todas as coleções sem paginação | Médio — pode crescer indefinidamente | Adicionar `limit` e `offset` |
| Cockpit geral | Múltiplos componentes com fetch redundante ao montar | Médio | Adotar React Query com `staleTime` para deduplicação |

---

## 6. EVENT BUS / TIMELINE / OBSERVABILIDADE

### ✅ Estrutura correta

- Todos os eventos publicados via `publishOperationalEvent` incluem `tenantId` obrigatório
- `eventDomain` separado corretamente por contexto (OPERATIONS, BILLING, etc.)
- `frank-event-sanitize.ts` aplicado no layer LLM

### 🟡 Ressalvas

| Evento | Arquivo de origem | Problema | Correção sugerida |
|---|---|---|---|
| `intent_captured` / `frank_suggestion_generated` | `intent.events.ts`, `suggestion.events.ts` | Parâmetro `payload: any` — risco de PII acidental no futuro | Tipar os payloads explicitamente |
| Eventos de `domineEvents` | `src/app/api/cockpit/audit/route.ts` | `total` calculava `domineFails.length` em vez do count real — paginação errada em páginas > 1 | **CORRIGIDO**: agora usa `COUNT(*)` para todos os três datasets |

---

## 7. HIGIENE DO REPOSITÓRIO

### Arquivos de artefato/debug que não deveriam estar no repositório

| Arquivo | Problema | Ação sugerida |
|---|---|---|
| `app-test-results.txt`, `app-test-results2.txt`, `app-test-results3.txt` | Resultados de teste temporários no root | Adicionar ao `.gitignore` ou remover |
| `me-test-results.txt`, `result-test.txt`, `test-output.txt`, `test-fails.txt` | Idem | Adicionar ao `.gitignore` |
| `aud-braspress.txt`, `patch-braspress.ts`, `test-braspress.ts` | Artefatos de teste/patch específicos de integração | Mover para `/tmp` ou remover |
| `debug.html` | Página HTML de debug no root | Remover ou mover para `/tmp` |
| `check-db.js`, `create-tables.ts`, `migrate-session.ts` | Scripts utilitários no root sem documentação de propósito | Mover para `/scripts` ou documentar |
| `raw_tables.json`, `runs.json`, `normalized-carriers.json` | Arquivos de dados brutos/export no root | Mover para `/tmp` ou `/datasets` |
| `repo_structure.txt`, `vercel-ls.txt` | Snapshots de estrutura — desatualizados | Remover |
| `ts_errors.txt` | Erros de TypeScript capturados manualmente | Remover (usar CI ao invés) |
| `rbac-audit.md` no root | Documento de auditoria no root (deveria estar em `/docs/audit/`) | Mover para `/docs/audit/` |
| `ARCHITECTURE.md` no root duplicado de `docs/ARCHITECTURE.md` | Duplicata | Consolidar em `/docs/ARCHITECTURE.md` |

### Dependências/scripts a revisar

- `tmp_artifacts/` e `tmp_artifacts_latest/` no root devem estar no `.gitignore`
- Scripts em `tools/` carecem de documentação clara de propósito

---

## 8. RELATÓRIO CONSOLIDADO

### A. BLOQUEIOS CRÍTICOS

> Nenhum bloqueio crítico identificado. O sistema tem salvaguardas adequadas para produção.

---

### B. RESSALVAS IMPORTANTES (roadmap imediato)

| # | Item | Área |
|---|---|---|
| 1 | **Tipar `payload: any` nos eventos de Frank** — risco de PII acidental futuro | Frank / Events |
| 2 | **Adicionar AbortController** nos polls de conversas/mensagens do Atendimento | Performance |
| 3 | **Paginação da timeline feed** — sem limite causa DOM crescente | Performance |
| 4 | **Limite de tamanho em playbook title/responseBase** — sem validação de tamanho máximo | Playbooks |
| 5 | **Limpar artefatos de debug/teste do root** do repositório | Higiene |

---

### C. MELHORIAS DE UX (Cockpit → fluidez tipo Pipedrive)

| # | Melhoria | Prioridade |
|---|---|---|
| 1 | **Unificar pedidos e cotações** em timeline única por cliente — hoje parecem módulos separados | Alta |
| 2 | **Drag-and-drop** no pipeline de estágios | Média |
| 3 | **Ações rápidas** nos cards de Frank (aprovar, editar, rejeitar sem abrir painel separado) | Alta |
| 4 | **Atalhos de teclado** para operadores (Enter para enviar, Esc para cancelar, etc.) | Média |
| 5 | **Reduzir cliques** para acessar histórico do cliente dentro do atendimento | Alta |

---

### D. MELHORIAS DE ARQUITETURA

| # | Item | Impacto |
|---|---|---|
| 1 | **React Query / SWR** para deduplicação de fetches e cache no cockpit | Alto |
| 2 | **WebSocket ou SSE** no atendimento em vez de polling para menor latência e menos carga | Alto |
| 3 | **Tipar payloads de eventos** com interfaces explícitas em vez de `any` | Médio |
| 4 | **Separar queries cross-domain** do endpoint de auditoria — criar endpoints dedicados por fonte | Médio |
| 5 | **Virtualização** na timeline feed e em listas longas (react-virtual) | Médio |

---

### E. QUICK WINS (alta relação impacto/esforço)

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | ✅ **Aumentar intervalos de poll** (8s/15s → 30s) | ~5 min | Alto — reduz carga do servidor |
| 2 | ✅ **Remover check de tenantId por query param** no cockpit/metrics/frank | ~2 min | Médio — remove vetor de enumeração |
| 3 | ✅ **Corrigir total count** no endpoint de auditoria | ~10 min | Médio — paginação correta |
| 4 | **Adicionar AbortController** nos polls do atendimento | ~15 min | Médio — previne memory leak |
| 5 | **Tipar payloads de eventos Frank** (`any` → interfaces) | ~30 min | Médio — previne regressão de PII |
| 6 | **Mover/remover artefatos de debug** do root para `.gitignore` | ~10 min | Baixo — higiene do repositório |

---

*Itens com ✅ foram corrigidos nesta auditoria. Os demais estão sinalizados para o roadmap.*
