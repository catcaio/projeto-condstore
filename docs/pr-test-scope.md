# PR Test Scope

## Objetivo

Definir um escopo prático de testes e gates para PRs pequenas sem perder segurança nas superfícies críticas do MVP.

## Regras Gerais

- Rode sempre `npm run guardrail:mvp-freeze` quando a branch tocar superfícies de produto.
- Use `npm run scope:pr-tests` para descobrir o menor conjunto de comandos sugerido para os arquivos alterados.
- Para validar paths específicos sem depender do diff atual, use `npm run scope:pr-tests -- --files <path...>`.
- PR localizada deve rodar testes localizados.
- PR cross-cutting deve escalar para gates amplos.
- `lint` e `typecheck` continuam sendo o piso para mudanças em código TypeScript/TSX, `package.json` ou scripts de tooling.

## Matriz path -> comandos mínimos obrigatórios

| Paths alterados | Comandos mínimos |
|---|---|
| `docs/**`, `AGENTS.md` | `npm run guardrail:mvp-freeze` |
| `scripts/**`, `package.json`, `vitest.config.*` | `npm run guardrail:mvp-freeze`, `npm run scope:pr-tests`, `npm run lint`, `npm run typecheck` |
| `src/modules/atendimento/**`, `src/app/api/whatsapp/**`, `src/server/twilio/**`, `src/app/(app)/cockpit/atendimento/**`, `src/app/api/cockpit/conversations/**` exceto `src/app/api/cockpit/conversations/**/quotes/**` | `npm run guardrail:mvp-freeze`, `npm run test:whatsapp`, `npm run lint`, `npm run typecheck` |
| `src/modules/cockpit/**`, `src/app/(app)/cockpit/**` fora de áreas frozen, `src/app/api/cockpit/metrics/**`, `src/app/api/cockpit/ops/**`, `src/app/api/cockpit/timeline/**`, `src/app/api/cockpit/custom-fields/**` | `npm run guardrail:mvp-freeze`, `npm run test:cockpit`, `npm run lint`, `npm run typecheck` |
| `src/modules/freight/**`, `src/modules/logistics/**`, `src/modules/logistica/**`, `src/modules/pedidos/**`, `src/modules/shipping/**`, `src/app/api/public/cotacao/**`, `src/app/api/orders/**`, `src/app/api/cockpit/conversations/**/quotes/**` | `npm run guardrail:mvp-freeze`, `npm run test:freight`, `npm run lint`, `npm run typecheck` |
| `src/app/api/**`, `src/middleware.ts`, `src/infra/auth/**`, `src/infra/security/**` | comandos da área + `npm run routes:verify-security`; some `npm run routes:sync` se o diff tocar `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx` ou `not-found.tsx` nas superfícies monitoradas |
| `src/drizzle/**`, `drizzle/**`, `db_check.ts`, `src/infra/repositories/**`, repositórios/queries acoplados a schema | comandos da área + `npm run db:verify` |
| `src/app/api/public/**`, `src/app/t/[token]/**`, `src/infra/attribution/**`, `src/modules/funnel/**`, `src/modules/metrics/**` | comandos da área + `node --import tsx scripts/guardrails-public-api.ts` |
| `next.config.mjs`, `src/app/**`, `src/ui/**`, `src/providers/**`, shared shell/client boundary | comandos da área + `npm run build` quando a mudança cruza renderização, routing ou boundary client/server |
| `package-lock.json`, `package.json`, configs globais (`tsconfig*`, `eslint.config.cjs`) | `npm run guardrail:mvp-freeze`, `npm run lint`, `npm run typecheck`; suba para `npm run test:coverage` se a mudança altera execução de testes, bundling ou resolução de módulos |

## Quando rodar testes localizados

- Quando o diff fica dentro de um domínio do MVP e suas costuras imediatas.
- Quando não há alteração em `middleware`, auth, rotas públicas, schema, configs globais ou build.
- Quando o diff não toca áreas frozen nem shared infra usada por múltiplos domínios.

## Quando rodar testes amplos

Rode `npm run test:mvp` quando:

- a mudança cruza WhatsApp + cockpit + freight no mesmo diff;
- uma costura support usada pelo core foi alterada (`src/domine/**`, `src/modules/domine/**`, `src/lib/events/**`, `src/app/api/domine/intake/**`, `src/app/api/internal/jobs/domine-process/**`, `src/modules/frank/entity-resolver.ts`, `src/modules/frank/intent-resolver.ts`, `src/modules/frank/session.repository.ts`, `src/modules/frank/conversation-control.ts`, `src/modules/frank/auto-response-guard.ts`, `src/modules/frank/suggestions/**`);
- a mudança toca `src/infra/repositories/**` junto com pelo menos duas áreas core no mesmo diff;
- o ajuste não cabe claramente em uma única área do MVP.

Rode `npm run test:coverage` quando:

- mexer em `middleware`, auth, multi-tenant, shared infra sob `src/lib/**` ou `src/core/**`, ou configuração global de testes;
- houver mudança em `package.json`, `vitest.config.*`, aliases, resolução de módulos, runtime flags, `next.config.mjs`;
- a PR tocar superfícies core e frozen ao mesmo tempo;
- a mudança for ampla o suficiente para invalidar o benefício do escopo localizado.

## Quando rodar typecheck global

- Sempre para mudanças em `*.ts`, `*.tsx`, `package.json`, `tsconfig*`, scripts de tooling ou import boundaries.
- Pode ser pulado apenas para docs puros sem scripts nem package changes.

## Quando rodar lint

- Sempre para mudanças em código de aplicação, scripts ou `package.json`.
- Pode ser pulado apenas para docs puros e metadados sem execução.

## Quando rodar verify-security / db verification / outros gates

- `npm run routes:verify-security`: qualquer mudança em `src/app/api/**`, `src/middleware.ts`, auth, RBAC, internal/public routes.
- `npm run routes:sync`: qualquer mudança em `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx` ou `not-found.tsx` sob `src/app/api/**`, `src/app/(app)/**`, `src/app/(public)/**`, `src/app/(auth)/**`, `src/app/billing/**`, `src/app/pricing/**` ou `src/app/t/**`.
- `npm run db:verify`: schema, migrations, tabelas, repositórios ou queries acopladas a schema.
- `node --import tsx scripts/guardrails-public-api.ts`: rotas públicas, attribution, tracking, eventos públicos.
- `npm run build`: mudanças em app shell, páginas, layouts, boundaries client/server, config de build.

## Exemplos práticos

### Exemplo 1: ajuste em `/cockpit/atendimento`

Arquivos:

- `src/app/(app)/cockpit/atendimento/**`
- `src/app/api/cockpit/conversations/**` fora de `quotes/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run test:whatsapp`
- `npm run lint`
- `npm run typecheck`
- `npm run routes:verify-security` se a rota API mudou

### Exemplo 2: ajuste em quotes dentro de conversations

Arquivos:

- `src/app/api/cockpit/conversations/[id]/quotes/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run test:freight`
- `npm run lint`
- `npm run typecheck`
- `npm run routes:verify-security`
- `npm run routes:sync`

### Exemplo 3: PR tocando middleware ou auth

Arquivos:

- `src/middleware.ts`
- `src/infra/auth/**`
- `src/app/api/auth/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run routes:verify-security`
- `npm run routes:sync` se o diff tocar arquivos de rota/layout/página monitorados
- `npm run lint`
- `npm run typecheck`
- `npm run test:coverage`

### Exemplo 4: docs/governança apenas

Arquivos:

- `docs/**`
- `AGENTS.md`

Comandos:

- `npm run guardrail:mvp-freeze`

### Exemplo 5: mudança excepcional em área frozen

Arquivos:

- `src/app/(app)/cockpit/frank/**`

Comandos:

- `ALLOW_FROZEN_SURFACE_CHANGES=1 npm run guardrail:mvp-freeze`
- `npm run scope:pr-tests`
- ampliar para `npm run test:coverage`, `npm run build` e os testes do domínio impactado
- explicar na PR qual critério de unfreeze foi atendido

### Exemplo 6: costura support/core compartilhada

Arquivos:

- `src/modules/domine/**`
- `src/modules/frank/intent-resolver.ts`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run test:mvp`
- somar `npm run test:coverage` quando a costura cair em shared infra sob `src/lib/**` ou `src/core/**`
