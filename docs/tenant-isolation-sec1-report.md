# Fechamento — Seção 1 "Segurança — Isolamento Multi-Tenant" (itens 1.1, 1.2, 1.3, 1.4)

> Relatório completo da frente P0/P1 do Plano de Ação CONDSTORE OS.
> Regra fundamental: um tenant jamais pode ler, alterar, excluir ou criar
> dados pertencentes a outro tenant, independentemente do caminho utilizado
> pela aplicação.

## Rastreabilidade

| Campo | Valor |
|---|---|
| Objetivo | Fechar os 4 itens da seção 1 (1.1, 1.2 P0; 1.3, 1.4 P1) |
| Escopo | Repositories tenant-scoped, rotas `[id]` dinâmicas, middleware spoof, suíte de isolamento, gate AST de regressão, contrato documentado |
| Fora de escopo | Evolução de superfície frozen (Frank runtime/training, knowledge/RAG, DOMINE Console); correções de `xlsx`/build ambiental; drift de migrations pré-existente |
| Branch | `feat/tenant-isolation-secao-1` (base: `feat/frank-supremo-fase-2-runtime-ativo-13111355878025426052`) |
| Agentes acionados | explorer (auditoria infra-repositories), explorer (auditoria modules), explorer (auditoria rotas IDOR) |
| Comandos executados | `typecheck`, `eslint` (arquivos tocados), `test:win-stable` (full), `test:cockpit`, `test:mvp`, `routes:verify-security`, `verify:tenant-isolation` (novo), `guardrail:mvp-freeze`, `scope:pr-tests`, `db:verify`, `build` |
| Decisão final | PR aberta para revisão; merge NÃO autorizado nesta frente |

## (A) Auditoria

### Cobertura (Fase 1, sem âncora nos 3 falso-positivos)

- **~34 arquivos** em `src/infra/repositories/**` (incl. `factories/`).
- **~26 repositórios** em `src/modules/**` (+ `src/infra/frank/**`) e services/use-cases com query direta (`db.select/insert/update/delete`, `getDb()`, `sql`, transactions, upserts, joins).
- **~120 rotas** em `src/app/api/**` com parâmetro dinâmico (`[id]`, `[orderId]`, `[conversationId]`, `[sourceId]`, `[tenantId]`, `[token]`).
- Workers/jobs/webhooks/consumers/scripts e tabelas do schema (14 tabelas sem `tenantId` validadas uma a uma).
- **Premissa corrigida (falso positivo confirmado)**: `project_reports` e `webhook_events` não têm `tenantId` **por desenho** (relatório interno de engenharia; dedup de webhook sem PII); `public_events.tenantId` é nullable por desenho (telemetria pré-identidade) e o repository é insert-only. Nenhum dos três é vulnerabilidade.

### Tabela de risco — vulnerabilidades reais encontradas e corrigidas

| Local | Operação | Tabela | Tenant-scoped? | Isolamento antes | Risco antes |
|---|---|---|---|---|---|
| `infra/repositories/domine-events.repository.ts` (`getById`, `markProcessed`, `markDone`, `markFailed`, `sendToDLQ`) | SELECT/UPDATE/INSERT | `domineEvents`, `domineEventsDlq` | sim | `WHERE id` nu | **VULNERÁVEL (real)** |
| `domine-events.repository.ts` (`lockAndGetNextEvent` lock, `retryFromDLQ` reset/delete) | UPDATE/DELETE | `domineEvents`, `domineEventsDlq` | sim | sem pin de tenant | **VULNERÁVEL (real, achado do gate AST)** |
| `infra/repositories/frank-events.repository.ts:66` | SELECT (dedup) | `frankEvents` | sim | sem tenant (supressão de escrita cross-tenant) | **VULNERÁVEL (real, severidade baixa)** |
| `infra/repositories/message.repository.ts` (`existsByMessageSid`) | SELECT | `messages` | sim | sem tenant (dead code, 0 callers) | **VULNERÁVEL (latente) → removido** |
| `infra/repositories/deliveries.repository.ts` (`findLatestLocationEvent`, update do read-model) | SELECT/UPDATE | `deliveryLocationEvents` (derivada), `deliveries` | mãe sim / filha não (por desenho) | sem gate de ownership | **VULNERÁVEL (latente)** |
| `app/api/cockpit/frank/knowledge/[id]` PUT | UPDATE | `frankKnowledge` | sim | `...body` sobrescrevia `tenantId` | **VULNERÁVEL (real — escrita cross-tenant)** |
| `app/api/tenants/[tenantId]/domine/actions` (`lookup_freight`) | SELECT | `domineFreightQuotes` | sim | `correlationId` sem tenant | **VULNERÁVEL (real — leitura cross-tenant)** |
| `infra/repositories/domine-read.repository.ts` (upserts) | UPDATE | `domineOrders`, `domineFreightQuotes` | sim | UPDATE pós-select sem pin | **VULNERÁVEL (check-then-act)** |

Check-then-act documentados sem alteração (sem path alcançável / fora do menor diff seguro): `frank-execution-state.updateRunStatus` (callers usam variante com check), `frank/actions/review.ts`, `freight-audit.ts`, auth-plane `users` (internal-gated).

### Exceções legítimas documentadas (Fase 8)

Tabelas sem `tenantId` validadas (14): `tenants` (raiz), `projectReports`, `webhookEvents` (precedentes globais), `securityEdgeEvents`, `securityIncidents` (logs com PII hasheada), `plans` (catálogo), `aiPrompts`, `aiEvalRuns`, `stripeEvents` (dedup assinado), `supremePlaybooks`, `supremeBenchmarks` (frozen/global), `publicEvents`/`attributionClicks` (nullable por desenho: pré-identidade / token-capability), `deliveryLocationEvents`/`governanceTaskLabelAssignments`/`playbookSteps` (derivadas, escopo herdado da mãe com gate verificado). Acessos sem filtro porém legítimos (allowlist do gate com motivo): auth-plane `users`, webhooks assinados por chave global única (reescopo pela linha), poller `frank-worker` (processa por `msg.tenantId`).

## (B) Arquitetura — item 1.2 (`docs/tenant-isolation-contract.md`)

**Mecanismo escolhido (combinação, sem RLS):** (1) `tenantId` obrigatório na API dos repositories (sempre da sessão, nunca de payload); (2) predicados centralizados já existentes `withTenantNotDeleted`/`withTenantIdNotDeleted` (`src/infra/db.ts`); (3) guards de sessão + middleware fail-closed; (4) regressão via gate AST + suíte SQL-level. **RLS nativa descartada com motivo técnico**: TiDB/MySQL (`mysql2` + Drizzle) não possui `CREATE POLICY`/contexto por conexão em pool compartilhado — enforcement é application-layer. **Migração total para wrapper descartada**: `createTenantRepository` tem 0 call sites; migrar ~60 repos violaria o menor diff seguro. Detalhes, ameaças impedidas/não-impedidas e pontos de enforcement: ver `docs/tenant-isolation-contract.md`.

## (C) Segurança — cenários cross-tenant testados (incl. IDOR de rota)

Suíte reutilizável Tenant A × Tenant B (`src/__tests__/tenant-isolation.test.ts`, 23 testes, assert no **SQL emitido** — não só "where foi chamado"): READ/UPDATE/DELETE/INSERT com `tenantId` de sessão, LIST, COUNT, UPSERT sem conflito cross-tenant, leitura derivada só após gate da mãe, `SET` sem `tenant_id`, oráculo SID removido. IDOR por rota (`src/__tests__/tenant-idor-routes.test.ts`, 4 testes): knowledge PUT ignora `tenantId` spoofado no body; `lookup_freight` com `correlationId` de B retorna `null`; `domine/events/[id]` de B retorna 404 (e 403 se a linha vazar — defesa em profundidade). Middleware (`middleware.test.ts` +2): spoof → **403 imediato**, com e sem sessão válida.

## (D) Resultado de testes e gates

| Gate | Resultado |
|---|---|
| `test:win-stable` (full) | **252 arquivos, 1220 testes, 0 falhas** (1 skip pré-existente) |
| `test:cockpit` / `test:mvp` (escopo `scope:pr-tests`) | 21 + 3 arquivos verdes |
| `verify:tenant-isolation` (novo, AST) | **194 cadeias em 55 arquivos, 0 gaps** (9 exceções allowlistadas) |
| `typecheck` | limpo nos arquivos da frente (2 erros `xlsx` pré-existentes, fora de escopo) |
| `eslint` (arquivos tocados) | limpo |
| `routes:verify-security` | verde (196 rotas, nenhum input inseguro) |
| `db:verify` | drift acusado refere-se a sujeira pré-existente do branch (1 linha em branco em `schema.ts`/`_journal.json`, sem schema change desta frente, sem migration pendente) |
| `build` | **falha pré-existente e ambiental**: `xlsx` declarado mas ausente em `node_modules` (`excel-parser.service.ts`, intocado; falha idêntica na árvore limpa) |
| `guardrail:mvp-freeze` | **vermelho pré-existente no branch** (`frank.client.tsx` e outros, intocados); esta frente adiciona 2 arquivos knowledge ao gate — fix P0 de escrita cross-tenant com diff mínimo, sem evoluir a superfície; `ALLOW_FROZEN_SURFACE_CHANGES=1` **requer aprovação humana**, não executado |

5 testes antigos do contrato strip-and-continue (`proxy.test.ts` ×4, `edge-security-events.test.ts` ×1) foram atualizados para o fail-closed — mudança intencional da Fase 1.4. 2 timeouts observados numa run completa (`frank.suggestions`, `llm-gateway`) são flakiness de contenção (passam isolados; arquivos intocados por esta frente).

## (E) Riscos restantes

1. `INTERNAL_*_TOKEN`: plano de controle cross-tenant por desenho — vazamento do segredo concede acesso total (segredo só server-side, nunca logado; rotação fora de escopo).
2. Workers globais legítimos (`frank-worker`, `queue`, retention, `workflow-engine`): mudanças exigem `security-auditor` + `tenant-isolation-auditor`.
3. PII em `search_index` (phone/email em texto): intra-tenant, pauta LGPD/purge.
4. `db.execute(sql)` cru e `db.query` relacional fora do gate AST (1 caso atual, internal-gated) — novos usos exigem revisão manual.
5. Build/typecheck `xlsx` e drift de migrations pré-existentes aguardam frente própria; merge desta PR não autorizado aqui.
