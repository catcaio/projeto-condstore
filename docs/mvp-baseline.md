# MVP Baseline (conversão do MVP Freeze)

> Mudança arquitetural de conceito: o MVP deixou de ser operacionalmente
> congelado. Este documento define o modelo vigente.

## O que mudou

| Antes (Freeze) | Agora (Baseline) |
|---|---|
| Tocar superfície listada = **bloqueio** (`exit 1`) sem `ALLOW_FROZEN_SURFACE_CHANGES=1` | Tocar superfície listada = **mudança intencional permitida**, apenas **reportada em voz alta** |
| Desenvolvimento travava sem opt-in | Desenvolvimento livre |
| Regressão detectada pelo veto | Regressão detectada pelo **report explícito** (`[BASELINE-TOUCH]` por arquivo, toda execução) |

## O que NÃO mudou (security invariants, bloqueantes)

- Tenant isolation (`verify:tenant-isolation` — AST, fail closed).
- Route security (`routes:verify-security`).
- Middleware fail-closed, testes IDOR, workflows de segurança.
- `tenantId` jamais vindo do cliente.
- Nenhuma exceção de segurança virou allowlist permanente (a allowlist do gate AST continua exigindo motivo documentado por item).

O guardrail (`guardrail:mvp-freeze` / alias `guardrail:mvp-baseline`) executa os gates de segurança como sub-checks e **falha (exit 1) se qualquer um deles falhar** — inclusive se o próprio gate quebrar ao executar. Falha de segurança nunca é mascarada como advisory.

## Compatibilidade

- Arquivo `scripts/verify-mvp-freeze.mjs` e npm script `guardrail:mvp-freeze` mantidos (CI, agentes, PR template os referenciam).
- `hardFrozenSurfaces` mantido como alias de `baselineSurfaces` (só detecção/classificação, nunca veto).
- `ALLOW_FROZEN_SURFACE_CHANGES=1` aceito, mas desnecessário para produto.

## Follow-up de governança (requer aprovação humana, NÃO feito aqui)

- Atualizar `AGENTS.md` (§ MVP Freeze / Critério de Unfreeze / flag).
- Atualizar `.github/instructions/mvp-freeze.instructions.md`, `.agents/rules/mvp-freeze.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `docs/governance/branch-protection.md`, `docs/pr-test-scope.md`.
- Textos de agentes (`.github/agents/*`) que mandam rodar o freeze como veto.
