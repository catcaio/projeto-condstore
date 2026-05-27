# MPV-113 — Cockpit Shell, Sidebar e Rotas Criticas

Data da validacao: 2026-05-27
Branch: `feat/mvp-113-gates-validation`

## Escopo implementado

- AppShell do Cockpit reconstruido com layout de viewport fixo, sidebar desktop dedicada e scroll interno no conteudo.
- Sidebar primaria filtrada por RBAC, sem `/dashboard` ou `Cockpit Legacy`, e sem expor `Tenant`/`Configuracoes` para operador.
- Rotas canonicas renderizadas no shell: `/cockpit`, `/cockpit/atendimento`, `/clientes`, `/metricas`, `/configuracoes`, `/tenant`, `/operacao`.
- Redirects legados adicionados: `/dashboard -> /cockpit`, `/settings -> /configuracoes`, `/cockpit/settings -> /configuracoes`.
- `WorkspaceFoundationPage` deixou de inferir tenant por seed/fallback hardcoded e passou a usar sessao/header autenticado.
- Estados de erro em clientes, pedidos, tenant/configuracoes e atendimento exibem falha rastreavel por `requestId` em vez de placeholder silencioso.
- Inventario/registro de rotas atualizado para os redirects legados.

## Gates executados

| Gate | Status | Evidencia |
|------|--------|-----------|
| `npm run guardrail:mvp-freeze` | PASS | Nenhuma superficie hard-frozen alterada em 16 arquivos |
| `npm run scope:pr-tests` | PASS | Acionou WhatsApp supervisionado e Cockpit operacional |
| `npm run lint` | PASS | ESLint sem erros |
| `npm run typecheck` | PASS | `tsc -p tsconfig.build.json --noEmit` sem erros |
| `npm run routes:sync` | PASS | 350 rotas detectadas e documentadas |
| `npm run routes:verify-security` | PASS | 195 rotas protegidas com guardrails; sem tenantId/userId inseguro via request |
| `npm run db:verify` | PASS | Offline, 130 tabelas, zero schema drift |
| `npm run test:whatsapp` | PASS | 21 arquivos, 140 testes |
| `npm run test:cockpit` | PASS | 21 arquivos, 58 testes |
| `npm run test:win-stable` | PASS | Suite completa Vitest com exit code 0 |
| `npm run test:coverage` | PASS | Inclui `lint:env`, `lint:pii` e Vitest com coverage |
| `npm run build` | PASS | Next build compilado e typecheck de build concluido |

## Validacao local via navegador

Dev server: `http://127.0.0.1:3015`

Resultados:

- `/dashboard` finalizou em `/cockpit` com HTTP 200.
- `/settings` finalizou em `/configuracoes` com HTTP 200.
- `/cockpit/settings` finalizou em `/configuracoes` com HTTP 200.
- `/cockpit`, `/cockpit/atendimento`, `/clientes`, `/metricas`, `/configuracoes`, `/tenant`, `/operacao` renderizaram AppShell com HTTP 200, sem login indevido e sem overflow horizontal.
- Sidebar de operador manteve `Cockpit`, `Atendimento`, `Clientes` e `Metricas`, sem `Tenant`, `Configuracoes`, `/dashboard` ou `Cockpit Legacy`.

Ressalvas:

- A integracao Browser do Codex falhou localmente antes da navegacao com erro de runtime `failed to write kernel assets`; a validacao equivalente foi executada com Playwright local.
- O console do browser registrou bloqueio CSP do script de Speed Insights (`va.vercel-scripts.com`), sem quebrar rotas ou renderizacao da issue.
- `db:verify` confirmou drift offline porque o processo do comando nao recebeu `DATABASE_URL`; a validacao browser/dev usou `.env.local` sem expor valores.

## Status

CONCLUIDO para o escopo tecnico da MPV-113 nesta branch.
