# Arquitetura do Sistema - Condstore OS (Estado Real)

**Last updated:** 2026-02-25  
**Baseline SHA (antes deste PR FRONT-01/docs):** `a5e210a`  
**Status:** pós-P0 (hardening, RBAC, cron, Sentry, PII) + smoke de staging

---

## Visão Geral

Aplicação Next.js (App Router) multi-tenant para operações de frete/analytics e automação via WhatsApp/Twilio, com:
- UI web (`/login`, `/dashboard`, telas operacionais; `/cockpit` redireciona para compatibilidade)
- APIs de produto e cockpit (`/api/*`, `/api/cockpit/*`)
- Webhooks (Twilio / eventos)
- Jobs internos e cron (retenção/cleanup, backfills)
- Observabilidade com `requestId`, logs estruturados e Sentry (opcional)
- Hardening de auth/rate limit/PII para ambiente de produção

---

## Diagrama (texto)

```text
Browser/UI (/login, /dashboard; /cockpit -> /dashboard)
  -> Next App Router pages/layouts (React Server + Client Components)
  -> /api/auth/* (login, me, logout)
  -> /api/cockpit/* (RBAC admin via guards)

Twilio / clientes externos
  -> /api/webhook, /api/events
  -> modules/* (freight, analytics, attribution, audit)
  -> infra/repositories/* -> Drizzle -> TiDB/MySQL
  -> Redis (cache, rate limit, session-like support where applicable)

Vercel Cron / internal ops
  -> /api/cron/cleanup (x-vercel-cron=1 ou token)
  -> modules/jobs/cleanupRetention -> retention-cleanup.service
  -> deletes/anonymization idempotentes por tabela

Observabilidade
  -> request-trace (x-request-id)
  -> structuredLogger / logger (redaction)
  -> Sentry (server/client/edge, opcional via DSN)
```

---

## Stack e Organização

### Stack principal
- `Next.js` App Router (`src/app`)
- `TypeScript`
- `Drizzle ORM` (`src/drizzle/schema.ts`)
- `TiDB/MySQL` via `DATABASE_URL`
- `Redis` (cache/rate limit)
- `Vitest` para testes
- `Vercel` (preview/prod + cron)

### Estrutura (alto nível)
- `src/app/*`: páginas, layouts e route handlers (API)
- `src/modules/*`: regras de negócio (frete, métricas, jobs, audit, etc.)
- `src/infra/*`: auth, logging, request tracing, repos, redis, config, observabilidade
- `src/db/*`: baseline de acesso a banco para Drizzle (`client.ts`, `config.ts`, `schema/*`, `migrations/*`)
- `src/ui/*`: tokens, tema e componentes UI reutilizáveis (FRONT-01)
- `scripts/*`: utilitários e smoke tests (`scripts/smoke/staging-smoke.ts`)
- `drizzle/*`: migrations SQL + metadata

---

## Multi-Tenant + RBAC (centralizado)

### Modelo
- Sessão carrega `tenantId` e `role`
- Roles suportadas: `admin | operator`
- Tipos/validação centralizados em `src/infra/auth/roles.ts`
- Guards centralizados em `src/infra/auth/guards.ts`:
  - `requireSession(req)` -> retorna sessão validada ou `401` padronizado
  - `requireAdmin(req)` -> exige sessão + role `admin` ou retorna `403` padronizado

### Rotas cockpit admin-only (atual)
As rotas abaixo usam `requireAdmin(...)` e não fazem checks ad-hoc de role espalhados:
- `/api/cockpit/analytics/events`
- `/api/cockpit/analytics/summary`
- `/api/cockpit/attribution/tokens` (`GET`/`POST`)
- `/api/cockpit/audit`
- `/api/cockpit/metrics`
- `/api/cockpit/metrics/acquisition`
- `/api/cockpit/metrics/freight`
- `/api/cockpit/metrics/funnel`
- `/api/cockpit/ops/status`
- `/api/cockpit/ops/run-rollup`

### Middleware (borda de proteção)
Arquivo: `src/middleware.ts`
- Protege `/cockpit/*` e `/api/cockpit/*` (além de outros paths sensíveis no matcher)
- Injeta/propaga `x-request-id`
- Valida token JWT e exige claims mínimos:
  - `sub` (string)
  - `tenantId` (string)
  - `role` estritamente `admin | operator`
- Falha com `401` (API) ou redirect para `/login` (UI) quando sem sessão/inválido

---

## Auth e Sessão

### Endpoints principais
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

### JWT + session version
Arquivo: `src/infra/auth/session.ts`
- Cookie: `condstore_session`
- Token JWT inclui:
  - `sub` (user id)
  - `email`
  - `tenantId`
  - `role`
  - `sv` (`sessionVersion`)
- `getSessionUser(req)` valida:
  1. assinatura JWT (`AUTH_SECRET`)
  2. busca usuário no DB
  3. compara `user.sessionVersion === payload.sv`
- Resultado: tokens antigos são rejeitados imediatamente após invalidação

### Logout com invalidação server-side
Arquivo: `src/app/api/auth/logout/route.ts`
- Não é só limpar cookie
- Se houver sessão válida, chama `invalidateSessions(userId)`
- `invalidateSessions` incrementa `users.session_version`
- Sempre limpa cookie e retorna `200 { success: true }`
- Tokens antigos passam a falhar em `/api/auth/me` e rotas autenticadas

### Reset interno de admin (staging/dev only)
Arquivo: `src/app/api/internal/auth/reset-admin/route.ts`
- `POST /api/internal/auth/reset-admin`
- Protegido por `x-internal-token` (mesmo token interno usado pelo diag)
- Bloqueado em `VERCEL_ENV=production`
- Faz hash da nova senha com o util de auth e incrementa `session_version`
- Uso principal: recuperar login de preview/staging de forma confiável

---

## Segurança e Hardening (P0)

### Rate limit (novo limiter, fail-closed)
Arquivo: `src/infra/security/rate-limiter.ts`
- Implementa rate limit com Redis + fallback em memória somente fora de produção
- Em produção, se Redis indisponível/erro:
  - **fail-closed** (`allowed=false`)
- Override explícito (opt-in):
  - `RATE_LIMIT_FAIL_OPEN=true` -> permite fail-open mesmo em produção
- Logs usam hash da chave (`hashRateLimitKeyForLog`) e não expõem PII

### Login usando limiter novo
Arquivo: `src/app/api/auth/login/route.ts`
- Login usa `rateLimiter.limit('auth.login', key, { max: 5, windowSec: 60 })`
- Chave = `ip + email normalizado`
- Logging de diagnóstico sem PII:
  - `reason = user_not_found | password_mismatch | schema_error | rate_limited`
  - `requestId`
  - `emailHash` / `rateLimitKeyHash`
- Resposta ao cliente continua genérica em falhas de credencial (`401`)

### Middleware fail-hard sem `AUTH_SECRET` em produção
Arquivo: `src/middleware.ts`
- Se `NODE_ENV=production` e `AUTH_SECRET` ausente:
  - `/api/cockpit/*` -> `500 { error: "MISCONFIG_AUTH_SECRET" }`
  - `/cockpit/*` -> `500` texto simples (sem redirect)
- Em dev/test pode usar fallback apenas local

### Segredos internos (diag/jobs)
Arquivo: `src/infra/config/internal-token.ts`
- Aceita `INTERNAL_DIAG_TOKEN` ou `INTERNAL_EXPORT_TOKEN`
- Em produção, ausência do token é erro
- Em dev/test, fallback efêmero é permitido (com warning)

---

## Observabilidade (requestId + logs + diag + Sentry)

### Request tracing
Arquivo: `src/infra/http/request-trace.ts`
- `makeRequestId()` usa `x-request-id`/`x-vercel-id` se houver, senão UUID
- `attachRequestIdHeader()` padroniza header nas respostas
- Wrappers:
  - `withRequestTrace(...)`
  - `withWebhookTrace(...)`
- Logs estruturados de início/fim/erro com `requestId`, `route`, `tenantId` (quando disponível)

### Loggers (redaction)
Arquivos:
- `src/infra/log/logger.ts` (`structuredLogger`)
- `src/infra/logger.ts` (`logger`)

Redaction cobre chaves sensíveis, incluindo:
- `authorization`, `cookie`, `secret`, `password`, `token`
- `phone`, `message`, `body`, `payload`

Os loggers também integram com Sentry em erros (sem enviar PII por padrão).

### Diagnóstico interno
Arquivo: `src/app/api/internal/diag/route.ts`
- `GET /api/internal/diag`
- Protegido por `x-internal-token`
- Retorna status de `db`, `redis`, `env`, `git_sha`, `uptime`, `version`
- Inclui `x-request-id`

### Sentry (opcional, desabilitado por padrão)
Arquivos:
- `instrumentation.ts`
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`
- `src/infra/observability/sentry.ts`

Comportamento:
- Inicializa apenas se `SENTRY_DSN` ou `NEXT_PUBLIC_SENTRY_DSN` existir
- `release` = `GIT_SHA` -> `VERCEL_GIT_COMMIT_SHA` -> `COMMIT_SHA` -> `dev`
- `tracesSampleRate` por `SENTRY_TRACES_SAMPLE_RATE` (default `0.05`)
- `sendDefaultPii=false`
- `beforeSend`/`beforeBreadcrumb` fazem redaction de headers, payloads e campos sensíveis (`phone`, `message`, `body`, etc.)
- `requestId` e `tenantId` são enviados como tags/extras quando disponíveis

---

## Cron e Retenção (cleanup)

### Rota de cron
Arquivo: `src/app/api/cron/cleanup/route.ts`
- `GET` e `POST` suportados
- Autenticação:
  - header `x-vercel-cron: 1`
  - ou query `?token=<CRON_TOKEN>`
- Sem auth -> `401 { error: "UNAUTHORIZED_CRON" }`
- Observabilidade:
  - `x-request-id`
  - logs `cron_cleanup_start` / `cron_cleanup_end`
- Resposta de sucesso:
  - `200 { ok: true, deleted: {...}, retentionDays }`

### Serviço/job de cleanup
Arquivos:
- `src/modules/jobs/cleanupRetention.ts`
- `src/modules/metrics/retention-cleanup.service.ts`
- `src/infra/config/data-retention.ts`

Comportamento:
- `cleanupRetention()` monta policy a partir de envs (default base `RETENTION_DAYS=90` no job cron)
- `runRetentionCleanup()` executa por tabela em batches (`LIMIT`), de forma idempotente
- Operações atuais:
  - `DELETE` em tabelas de eventos/logs antigos
  - `ANONYMIZE` em PII de `messages` e `freight_funnel_events`
- Retorna contagem por tabela + total

Observação operacional:
- Se houver drift de schema no staging, a recomendação é reconciliar migrations. O cleanup foi desenhado para ser repetível e seguro com `0` registros afetados.

---

## PII Hardening (telefone + conteúdo)

### Objetivo
Remover dependência de telefone em claro para lookup/dedup e reduzir persistência de conteúdo sensível.

### Estratégia atual (dual-write + backfill)

#### Telefone
Arquivos:
- `src/infra/pii/phone.ts`
- `src/infra/pii/crypto.ts`

Implementado:
- `normalizeE164(input)` (normalização e validação básica)
- `deriveTenantPhoneSalt(tenantId)` usando HMAC-SHA256 com `AUTH_SECRET`
- `phoneHash(e164, tenantSalt)` / `hashPhoneForTenant(...)`
- `encryptString()` / `decryptString()` com AES-256-GCM
- `PII_ENCRYPTION_KEY` obrigatório em produção (fail-hard)

Persistência (schema Drizzle)
- `messages`
  - `phone_hash`
  - `phone_encrypted`
  - `body_encrypted`
  - legado `from_phone`/`body` mantido temporariamente (com placeholders/redaction)
- `freight_funnel_events`
  - `phone_hash`
  - `phone_encrypted`
  - legado `phone_number` mantido temporariamente (com placeholder)

Lookup/dedup:
- Preferência por `phone_hash` (ex.: índices por `tenant_id + phone_hash + created_at`)

Exibição/contato:
- Usar `phone_encrypted` (decrypt somente quando necessário)

#### Backfill de PII
Arquivos:
- `src/modules/jobs/backfillPhonePii.ts`
- `src/app/api/internal/jobs/backfill-phone/route.ts`

Comportamento:
- Varre batches de registros legados em `messages` e `freight_funnel_events`
- Preenche `phone_hash` + `phone_encrypted`
- Move `body` para `body_encrypted` e substitui texto em claro por placeholder (`[encrypted:n]` / `[redacted]`)
- Rota interna protegida por `x-internal-token`

#### Retenção de PII / conteúdo
Arquivo: `src/modules/metrics/retention-cleanup.service.ts`
- `messages`: anonimiza `from_phone`, limpa `phone_encrypted`, substitui `body`, limpa `body_encrypted`
- `freight_funnel_events`: anonimiza `phone_number`, limpa `phone_encrypted`
- Prazos controlados por envs (`RETENTION_MESSAGE_PII_DAYS`, `RETENTION_FUNNEL_PII_DAYS`, etc.)

### Garantias anti-vazamento
- Logs e Sentry redigem `phone`, `message`, `body`, `payload`, `token`, `cookie`, etc.
- `errorResponse` usado nas rotas críticas evita ecoar payload sensível
- Diagnósticos de login usam hashes (`emailHash`, `rateLimitKeyHash`)

---

## APIs Internas / Jobs Operacionais

### `/api/internal/diag`
- Diagnóstico básico de runtime/DB/Redis
- Protegido por `x-internal-token`

### `/api/internal/jobs/backfill-phone`
- Backfill de `phone_hash` / `phone_encrypted` / `body_encrypted`
- Protegido por `x-internal-token`
- Audit log interno (`ops.backfill_phone_pii`)

### `/api/internal/auth/reset-admin` (staging/dev only)
- Reset de senha do admin local (`admin@condstore.local` ou outro email fornecido)
- Protegido por `x-internal-token`
- Bloqueado em produção (`VERCEL_ENV=production`)

---

## Frontend Foundation (FRONT-01)

### Objetivo
Base visual consistente no estilo "grouped settings" (iOS Settings-inspired), sem adicionar design system pesado.

### Entregas desta etapa
- Tokens em `src/ui/tokens/*`
  - `colors`, `spacing`, `radius`, `typography`, `shadows`, `zIndex`
- Componentes base em `src/ui/components/*`
  - `Card`, `ListGroup`, `ListItem`, `Separator`, `Badge`, `Button`, `TextField`, `NavItem`
- Tema em `src/ui/theme/*`
  - `ThemeProvider`
  - `ThemeScript` (bootstrap anti-flicker)
  - `ThemeToggle`
- Aplicação inicial em:
  - `/login`
  - shell/layout base de `/cockpit`

### Tema (light/dark/system)
- Preferência persistida em `localStorage` (`condstore.theme`)
- `ThemeScript` aplica `data-theme` antes da hidratação para reduzir flicker
- `ThemeProvider` sincroniza com `prefers-color-scheme` quando modo `system`
- Variáveis CSS semânticas definidas em `src/app/globals.css`

---

## Smoke Test de Staging

Arquivo/script:
- `scripts/smoke/staging-smoke.ts`
- `npm run staging:smoke -- <preview-url>`

Checks principais:
- `GET /api/internal/diag` com `x-internal-token` -> `200` (`db=ok`, `redis=ok`)
- Cockpit sem auth -> `401`
- RBAC cockpit (`operator=403`, `admin=200`) quando tokens/creds disponíveis
- `POST /api/auth/logout` + `GET /api/auth/me` com token antigo -> invalidação efetiva (`401`)
- Cron cleanup sem auth -> `401`
- Cron cleanup com `CRON_TOKEN` -> `200`
- Validação de `x-request-id` nas rotas críticas

Entrada por env (sem valores):
- `INTERNAL_DIAG_TOKEN`
- `CRON_TOKEN`
- `TOKEN_ADMIN` / `TOKEN_OPERATOR` (opcional)
- ou `LOGIN_ADMIN_EMAIL` + `LOGIN_ADMIN_PASSWORD`
- ou `LOGIN_OPERATOR_EMAIL` + `LOGIN_OPERATOR_PASSWORD`

---

## Variáveis de Ambiente (principais) e propósito

### Runtime / Build / Identidade
- `NODE_ENV`: modo (`development`/`production`/`test`)
- `VERCEL_ENV`: ambiente Vercel (`preview`/`production`/...)
- `GIT_SHA`, `VERCEL_GIT_COMMIT_SHA`, `COMMIT_SHA`: release/versionamento (diag + Sentry)
- `APP_URL`: URL base pública (quando aplicável)
- `LOG_LEVEL`: nível de log da aplicação

### Banco / Cache
- `DATABASE_URL`: conexão TiDB/MySQL (obrigatória)
- `REDIS_URL`: conexão Redis (cache/rate limit)

### Auth / Sessão / Segurança
- `AUTH_SECRET`: assinatura de sessão JWT (obrigatória em produção)
- `JWT_SECRET`: compat legado em alguns fluxos (login fallback de env)
- `RATE_LIMIT_FAIL_OPEN`: override explícito para fail-open do limiter em produção (default `false`)
- `RATE_LIMIT_DEFAULT_MAX`, `RATE_LIMIT_DEFAULT_WINDOW_SECONDS`: política default de rate limit (quando usada)

### Internos / Operação
- `INTERNAL_DIAG_TOKEN`: token para `/api/internal/diag` e rotas internas protegidas
- `INTERNAL_EXPORT_TOKEN`: alias/compat para token interno
- `SEED_TOKEN`: proteção de endpoints de seed (ex.: admin seed)
- `ADMIN_SEED_PASSWORD`: senha do seed admin (quando seed cria usuário)
- `CRON_TOKEN`: auth por query no `/api/cron/cleanup`

### PII / Criptografia
- `PII_ENCRYPTION_KEY`: chave AES-256-GCM para `phone_encrypted`/`body_encrypted` (obrigatória em produção)
- `PROVIDER_SECRETS_KEY`: proteção de segredos de providers (hard check em produção no boot)

### Observabilidade / Sentry (opcional)
- `SENTRY_DSN`: DSN Sentry server/edge
- `NEXT_PUBLIC_SENTRY_DSN`: DSN Sentry client
- `SENTRY_TRACES_SAMPLE_RATE`: sampling de tracing (default `0.05`)

### Retenção / Cleanup
- `RETENTION_DAYS`: base default do job de cron cleanup (fallback `90`)
- `RETENTION_PUBLIC_EVENTS_DAYS`
- `RETENTION_FUNNEL_DAYS`
- `RETENTION_FREIGHT_LOGS_DAYS`
- `RETENTION_ATTR_CLICKS_DAYS`
- `RETENTION_DEDUP_DAYS`
- `RETENTION_MESSAGE_PII_DAYS`
- `RETENTION_FUNNEL_PII_DAYS`

### Twilio / Webhooks / Tracking (principais integrações)
- `TWILIO_AUTH_TOKEN`
- `TWILIO_WHATSAPP_NUMBER`
- `TWILIO_WEBHOOK_BASE_URL`
- `TWILIO_SIGNATURE_VALIDATION_ENABLED`
- `TRACKING_REDIRECT_MODE`
- `TRACKING_REDIRECT_URL`

### Pagamentos / terceiros (quando habilitado)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `MELHORENVIO_TOKEN`
- `MELHORENVIO_API_URL`

> Nota: existem outras envs de módulos específicos (AI/RAG/Frank/metrics) no código. A lista acima cobre as variáveis centrais de segurança, auth, observabilidade, cron, PII e operação usadas no estado atual pós-P0.

---

## Fluxos-chave (resumo)

### Login -> sessão -> cockpit
1. `POST /api/auth/login` valida payload
2. Rate limit `auth.login` (IP + email normalizado)
3. Busca usuário + verifica senha
4. Emite JWT com `sv=sessionVersion`
5. UI acessa `/cockpit/*`
6. Middleware valida JWT + role e injeta headers auth internos
7. Route handlers do cockpit aplicam `requireAdmin()` (RBAC central)

### Logout -> invalidação imediata
1. `POST /api/auth/logout`
2. `getSessionUser()` resolve usuário atual
3. `invalidateSessions(userId)` incrementa `session_version`
4. Cookie é limpo
5. Token antigo falha em `getSessionUser()` por mismatch de `sv`

### Cron cleanup
1. Vercel chama `/api/cron/cleanup`
2. Auth por `x-vercel-cron=1` ou `?token=CRON_TOKEN`
3. `cleanupRetention()` resolve policy de retenção
4. `runRetentionCleanup()` executa deletes/anonymize por tabela
5. Retorna `200` com contagens e `x-request-id`

---

## Riscos Operacionais Conhecidos / Checklist de Deploy

- **Schema drift em staging** quebra login/analytics/cleanup: manter migrations alinhadas ao `src/drizzle/schema.ts`
- **`AUTH_SECRET` ausente em produção** bloqueia cockpit (comportamento intencional fail-hard)
- **`PII_ENCRYPTION_KEY` ausente em produção** quebra criptografia PII (comportamento intencional fail-hard)
- **Redis indisponível em produção** bloqueia rate limits (fail-closed), salvo override explícito `RATE_LIMIT_FAIL_OPEN=true`
- **Sentry sem DSN** não quebra build/runtime (fica desabilitado)

Checklist rápido de preview/staging:
- `DATABASE_URL`, `AUTH_SECRET`, `PII_ENCRYPTION_KEY`, `CRON_TOKEN`, `INTERNAL_DIAG_TOKEN`
- `REDIS_URL` (recomendado)
- `SEED_TOKEN` / `ADMIN_SEED_PASSWORD` (se usar seed/reset de admin)
- `npm run staging:smoke -- <preview-url>`

---

## Referências de Código (arquivos-chave)

- Auth/sessão: `src/infra/auth/session.ts`
- RBAC/guards: `src/infra/auth/roles.ts`, `src/infra/auth/guards.ts`
- Middleware: `src/middleware.ts`
- Login/logout/me: `src/app/api/auth/login/route.ts`, `src/app/api/auth/logout/route.ts`, `src/app/api/auth/me/route.ts`
- Rate limiting: `src/infra/security/rate-limiter.ts`, `src/infra/rate-limiter.ts`
- Request trace/logs: `src/infra/http/request-trace.ts`, `src/infra/log/logger.ts`, `src/infra/logger.ts`
- Diag: `src/app/api/internal/diag/route.ts`
- Sentry: `src/infra/observability/sentry.ts`, `instrumentation.ts`, `sentry.*.config.ts`
- Cron cleanup: `src/app/api/cron/cleanup/route.ts`, `src/modules/jobs/cleanupRetention.ts`
- Retenção/anonimização: `src/modules/metrics/retention-cleanup.service.ts`
- PII (phone/body): `src/infra/pii/phone.ts`, `src/infra/pii/crypto.ts`, `src/modules/jobs/backfillPhonePii.ts`
- UI foundation (FRONT-01): `src/ui/tokens/*`, `src/ui/components/*`, `src/ui/theme/*`
- Smoke: `scripts/smoke/staging-smoke.ts`
