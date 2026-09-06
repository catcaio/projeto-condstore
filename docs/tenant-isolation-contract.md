# Contrato de Isolamento Multi-Tenant — CONDSTORE OS

> Seção 1 do Plano de Ação (itens 1.1, 1.2, 1.3, 1.4). Fonte de verdade para
> como o isolamento é imposto, por que o mecanismo foi escolhido, o que ele
> cobre e o que ele não cobre.

Regra fundamental: **um tenant jamais pode ler, alterar, excluir ou criar
dados pertencentes a outro tenant, independentemente do caminho utilizado
pela aplicação.**

---

## 1. Decisão (item 1.2): combinação de mecanismos, sem RLS

### Escolhido: convenção de API + predicados centralizados + guards + gate AST

1. **Repository API com `tenantId` obrigatório** — todo método que toca tabela
   tenant-scoped recebe `tenantId` como parâmetro (primeiro, sempre derivado
   da sessão) ou é construído já vinculado a ele. Nunca aceita `tenantId` de
   payload de cliente sem validação contra a sessão.
2. **Predicados centralizados em `src/infra/db.ts`** —
   `withTenantNotDeleted(table, tenantId, ...conds)` e
   `withTenantIdNotDeleted(table, tenantId, id, ...conds)` compõem o
   `WHERE tenant_id = ?` (+ soft-delete) num único ponto. Repositórios novos
   devem usá-los; repositórios legados usam `and(eq(t.tenantId, tenantId), …)`
   equivalente — o gate AST aceita ambas as formas.
3. **Camada de rota** — `requireSession()` / `requireSessionTenantMatch()` /
   `requireAdmin()` resolvem o tenant do JWT assinado no servidor; o
   middleware vincula `/api/tenants/[tenantId]` ao tenant da sessão (403 em
   mismatch) e opera fail-closed contra header spoof (403 imediato).
4. **Regressão futura (não-grep)** —
   `npm run verify:tenant-isolation` (AST via TypeScript compiler API, sem
   regex sobre texto) + suíte `src/__tests__/tenant-isolation.test.ts` e
   `src/__tests__/tenant-idor-routes.test.ts` (assert no SQL emitido, não só
   "where foi chamado").

### Rejeitado: Row-Level Security nativa

TiDB/MySQL (driver `mysql2` + Drizzle) **não possui** políticas row-level
(`CREATE POLICY`, variáveis de sessão por conexão como `current_setting()` do
Postgres). Não há primitiva do motor para impor `tenant_id` por conexão de
pool compartilhado; prototipar RLS seria emular no app o que o motor não
oferece. Por isso o enforcement é **application-layer**, e a defesa contra
regressão é o gate AST + testes, não o banco.

### Rejeitado: migração total para `TenantScopedRepository` wrapper

O factory `createTenantRepository()` existe (`src/infra/repositories/factories/`),
mas tem **zero call sites** — migrar ~60 repositórios para um wrapper novo
seria um refactor amplo com alto risco de regressão, violando a regra do
menor diff seguro. A convenção vigente (tenantId obrigatório + predicados
centralizados) entrega a mesma garantia no SQL com diff mínimo. O factory
permanece disponível para código novo onde for natural.

### Ameaças que o mecanismo IMPEDE

- Leitura/escrita/exclusão cross-tenant por ID direto (IDOR) — todo acesso
  por `[id]`/`[orderId]`/`[conversationId]` passa `session.tenantId`.
- Override de tenant via payload (`...body` sobre `tenantId`, `tenantId` em
  query/body) — rotas usam exclusivamente o tenant da sessão; `routes:verify-security`
  já barra extração de `tenantId`/`userId` de input.
- Header spoof (`x-tenant-id`, `x-auth-role`, …) — middleware aborta 403
  imediato (fail-closed), sem depender de remoção de header.
- Dedup/idempotência cross-tenant (`frankEvents` correlationId, `messages`
  SID removido, upserts com conflito por `(tenantId, …)`).
- Vazamento via tabelas derivadas sem `tenantId` (`delivery_location_events`)
  — leitura só após gate de ownership na tabela-mãe.

### Ameaças que o mecanismo NÃO impede (riscos residuais)

- **Vazamento de `INTERNAL_*_TOKEN`**: rotas `/api/internal/**` são
  cross-tenant por desenho (plano de controle). Mitigação: segredo só
  server-side, nunca logado; fora do escopo desta frente auditar rotação.
- **Bugs em workers/jobs com acesso global legítimo** (frank-worker,
  queue, retention, workflow-engine): operam cross-tenant por desenho, mas
  processam cada linha sob o `tenantId` da própria linha. Mudanças nesses
  arquivos exigem `security-auditor` + `tenant-isolation-auditor`.
- **PII em índices derivados** (`search_index` guarda phone/email em texto):
  intra-tenant, mas relevante para LGPD/purge — registrado como observação,
  não como vazamento cross-tenant.
- **SQL fora do gate**: `db.execute(sql``)` cru e `db.query` relacional não
  são cobertos pelo AST (só cadeias builder). Hoje há 1 caso (`users` password
  UPDATE, internal-gated). Novos usos exigem revisão manual.

### Onde ocorre o enforcement / como regressão é detectada

| Camada | Ponto | Detecção de regressão |
|---|---|---|
| SQL | `.where()` com `tenant_id` em toda cadeia sobre tabela scoped | `verify:tenant-isolation` (AST) falha o gate |
| Repository API | `tenantId` obrigatório, nunca de payload | suíte tenant-isolation (assert no SQL) |
| Rota `[id]` | `session.tenantId` repassado; 404/403 cross-tenant | `tenant-idor-routes.test.ts` |
| Edge | spoof → 403 imediato | `middleware.test.ts` |
| Input | sem `tenantId` de query/body | `routes:verify-security` (existente) |

---

## 2. Auditoria — o que foi analisado e achado (Fase 1)

- **~34 arquivos** em `src/infra/repositories/**`, **~26 repositórios** em
  `src/modules/**` (+ `src/infra/frank/**`), **services/use-cases com query
  direta**, **~120 rotas** em `src/app/api/**` com parâmetro dinâmico,
  workers/jobs/webhooks/consumers e scripts.
- **Âncora descartada (falso positivo confirmado)**: `project_reports` e
  `webhook_events` não têm coluna `tenantId` **por desenho** (global);
  `public_events.tenantId` é nullable por desenho (telemetria pré-identidade)
  e o repository é insert-only. Não são vulnerabilidades.
- **Vulnerabilidades reais encontradas e corrigidas** (nenhuma é um dos 3
  arquivos acima):
  1. `domine-events.repository` — `getById`/`markProcessed`/`markDone`/
     `markFailed`/`sendToDLQ` por `id` nu; lock atômico e `retryFromDLQ`/DLQ
     delete sem pin de tenant. → todos tenant-scoped.
  2. `frank-events.repository` — janela de dedup por `correlationId` sem
     tenant (supressão de escrita cross-tenant). → scoped.
  3. `message.repository.existsByMessageSid` — leitura sem tenant (dead code,
     zero callers). → **removido**.
  4. `deliveries.repository.findLatestLocationEvent` — leitura de tabela
     derivada por `deliveryId` nu. → gate de ownership na mãe + update do
     read-model tenant-scoped.
  5. `PUT cockpit/frank/knowledge/[id]` — `...body` sobrescrevia `tenantId`
     (escrita cross-tenant). → campos explícitos + `SET` nunca contém tenant.
  6. `POST tenants/[tenantId]/domine/actions` (`lookup_freight`) — lookup por
     `correlationId` sem tenant (leitura cross-tenant). → scoped ao tenant
     da rota.
  7. `domine-read.upsertOrder` / `upsertFreightQuoteReadModel` — UPDATE
     pós-select sem pin de tenant. → scoped.
- **Check-then-act documentados (baixo risco, sem exposição ativa)**:
  `frank-execution-state.updateRunStatus` (variante com tenant-check usada
  pelos callers), `frank/actions/review.ts`, `freight-audit.ts`,
  `user.repository` auth-plane (gated). Não alterados para não expandir
  escopo para superfície frozen/sem path alcançável.

## 3. Exceções documentadas (Fase 8) — global / system / capability

Toda tabela sem `tenantId` teve a ausência validada (14 tabelas). Legítimas:

| Tabela | Motivo |
|---|---|
| `tenants` | Raiz do sistema (ela É o tenant). |
| `projectReports` | Relatórios internos de módulo/engenharia, sem dado de tenant. Precedente. |
| `webhookEvents` | Dedup/integridade `(provider, eventId)`, sem PII. Precedente. |
| `securityEdgeEvents`, `securityIncidents` | Logs de segurança com PII hasheada. |
| `plans` | Catálogo global de planos (billing). |
| `aiPrompts`, `aiEvalRuns` | Catálogo/avaliação global de prompts. |
| `stripeEvents` | Dedup de webhook Stripe (assinado). |
| `supremePlaybooks`, `supremeBenchmarks` | Superfície frozen, global por desenho. |
| `publicEvents` (`tenantId` nullable) | Telemetria pré-identidade; insert-only. |
| `attributionClicks` (`tenantId` nullable) | Token-capability: o token aleatório É o segredo de autorização. |
| `deliveryLocationEvents`, `governanceTaskLabelAssignments`, `playbookSteps` | Filhas derivadas — escopo herdado da mãe via gate de ownership (verificado nos repositories). |

Exceções operacionais com `tenantId` mas acesso sem filtro (allowlist do gate,
cada uma com motivo): auth-plane (`users` por email/JWT-sub, password UPDATE
internal-gated), webhooks assinados por chave global única
(`external_shipment_id`, `provider_message_id` — escrita re-scoped pela linha),
poller de plano de controle (`frank-worker`, lê global, processa por
`msg.tenantId`).

## 4. Testes e gates executados

- `src/__tests__/tenant-isolation.test.ts` (23 testes: READ/UPDATE/DELETE/
  INSERT/LIST/COUNT/UPSERT/derivadas/SET-puro) — SQL real inspecionado.
- `src/__tests__/tenant-idor-routes.test.ts` (4 testes IDOR por rota).
- `src/__tests__/middleware.test.ts` (+2 testes fail-closed 403).
- `npm run verify:tenant-isolation` — 194 cadeias em 55 arquivos, 0 gaps.
- `typecheck`, `lint`, `test:win-stable` (escopo afetado), `build`,
  `guardrail:mvp-freeze`, `scope:pr-tests`.
