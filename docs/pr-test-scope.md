# PR Test Scope

## Objetivo

Definir um escopo prático de testes e gates para PRs pequenas sem perder segurança nas superfícies críticas do MVP.

## Regras Gerais

- Rode sempre `npm run guardrail:mvp-freeze` quando a branch tocar superfícies de produto.
- Use `npm run scope:pr-tests` para descobrir o menor conjunto de comandos sugerido para os arquivos alterados.
- PR localizada deve rodar testes localizados.
- PR cross-cutting deve escalar para gates amplos.
- `lint` e `typecheck` continuam sendo o piso para mudanças em código TypeScript/TSX, `package.json` ou scripts de tooling.

## Matriz path -> comandos mínimos obrigatórios

| Paths alterados | Comandos mínimos |
|---|---|
| `docs/**`, `AGENTS.md` | `npm run guardrail:mvp-freeze` |
| `scripts/**`, `package.json`, `vitest.config.*` | `npm run guardrail:mvp-freeze`, `npm run scope:pr-tests`, `npm run lint`, `npm run typecheck` |
| `src/modules/atendimento/**`, `src/app/api/whatsapp/**`, `src/server/twilio/**`, `src/app/(app)/cockpit/atendimento/**`, `src/app/api/cockpit/conversations/**` | `npm run guardrail:mvp-freeze`, `npm run test:whatsapp`, `npm run lint`, `npm run typecheck` |
| `src/modules/cockpit/**`, `src/app/(app)/cockpit/**` fora de áreas frozen, `src/app/api/cockpit/metrics/**`, `src/app/api/cockpit/ops/**`, `src/app/api/cockpit/timeline/**`, `src/app/api/cockpit/custom-fields/**` | `npm run guardrail:mvp-freeze`, `npm run test:cockpit`, `npm run lint`, `npm run typecheck` |
| `src/modules/freight/**`, `src/modules/logistics/**`, `src/modules/logistica/**`, `src/modules/pedidos/**`, `src/modules/shipping/**`, `src/app/api/public/cotacao/**`, `src/app/api/orders/**`, `src/app/api/cockpit/conversations/**/quotes/**` | `npm run guardrail:mvp-freeze`, `npm run test:freight`, `npm run lint`, `npm run typecheck` |
| `src/app/api/**`, `src/middleware.ts`, `src/infra/auth/**`, `src/infra/security/**` | comandos da área + `npm run routes:verify-security`; adicione `npm run routes:sync` se criou/removeu/renomeou rota |
| `src/drizzle/**`, `drizzle/**`, `db_check.ts`, repositórios que assumem schema novo | comandos da área + `npm run db:verify` |
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
- uma costura support usada pelo core foi alterada (`lib/events`, `src/domine/**`, `src/modules/frank/*` de compatibilidade, `src/infra/repositories/**`);
- o ajuste não cabe claramente em uma única área do MVP.

Rode `npm run test:coverage` quando:

- mexer em `middleware`, auth, multi-tenant, shared infra ou configuração global de testes;
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
- `npm run routes:sync`: criação, remoção, rename ou mudança de classificação/autorização de rotas.
- `npm run db:verify`: schema, migrations, tabelas, repositórios ou queries acopladas a schema.
- `node --import tsx scripts/guardrails-public-api.ts`: rotas públicas, attribution, tracking, eventos públicos.
- `npm run build`: mudanças em app shell, páginas, layouts, boundaries client/server, config de build.

## Exemplos práticos

### Exemplo 1: ajuste em `/cockpit/atendimento`

Arquivos:

- `src/app/(app)/cockpit/atendimento/**`
- `src/app/api/cockpit/conversations/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run test:whatsapp`
- `npm run lint`
- `npm run typecheck`
- `npm run routes:verify-security` se a rota API mudou

### Exemplo 2: ajuste em cálculo ou adapter de frete

Arquivos:

- `src/modules/freight/**`
- `src/modules/logistics/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run test:freight`
- `npm run lint`
- `npm run typecheck`

### Exemplo 3: PR tocando middleware ou auth

Arquivos:

- `src/middleware.ts`
- `src/infra/auth/**`
- `src/app/api/auth/**`

Comandos:

- `npm run guardrail:mvp-freeze`
- `npm run routes:verify-security`
- `npm run routes:sync` se houve mudança de superfície
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
