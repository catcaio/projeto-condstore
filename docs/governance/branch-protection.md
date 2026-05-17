# Branch Protection — CONDSTORE OS

> **Documento normativo.** Descreve as regras de proteção da branch `main`, os status checks reais exigidos e o processo obrigatório para merge de PRs.
> Não altere sem revisão de `@catcaio` (ver `.github/CODEOWNERS`).

---

## Branch: `main`

### Regras ativas (configurar em Settings → Branches → Branch protection rules)

| Regra | Valor |
|---|---|
| Require a pull request before merging | ✅ enabled |
| Required approvals | 1 (mínimo) |
| Dismiss stale reviews when new commits are pushed | ✅ enabled |
| Require review from Code Owners | ✅ enabled (`.github/CODEOWNERS` ativo) |
| Require status checks to pass before merging | ✅ enabled |
| Require branches to be up to date before merging | ✅ enabled |
| Do not allow bypassing the above settings | ✅ enabled — ver seção Emergências |
| Allow force pushes | ❌ disabled |
| Allow deletions | ❌ disabled |

**Regra de merge:** Proibido merge com checks pendentes, falhos ou com `skipped` indevido.

---

## Status checks obrigatórios no GitHub

Estes são os **nomes reais dos jobs/checks** que devem constar como "required status checks" no GitHub (Settings → Branches).  
O GitHub só exibe checks que já executaram ao menos uma vez. Verificar presença após a primeira execução em PR.

**Obrigatórios (por workflow):**
- `CI Quality Gate` obrigatório → check real no GitHub: `Quality Gates`.
- `Security` obrigatório → checks reais no GitHub: `Dependency Audit`, `Lint & Release Check`.
- `Vercel` obrigatório se estiver configurado como required check → check real no GitHub: `Vercel`.

| Nome do check no GitHub | Workflow | Arquivo |
|---|---|---|
| `Quality Gates` | CI Quality Gate | `.github/workflows/ci.yml` |
| `Dependency Audit` | Security | `.github/workflows/security.yml` |
| `Lint & Release Check` | Security | `.github/workflows/security.yml` |
| `Vercel` | Deploy externo (Vercel App) | configurado no Vercel Dashboard |

> **Nota:** O check `Vercel` deve ser marcado como required somente se o projeto estiver com Vercel integrado como required check no repositório. Verificar em Settings → Branches.

---

## Gates internos executados dentro do CI Quality Gate

Os itens abaixo são **etapas do job `Quality Gates`** (`.github/workflows/ci.yml`), não status checks independentes no GitHub. Todos devem passar para que o check `Quality Gates` fique verde.

| Gate interno | Step no CI | Comando |
|---|---|---|
| Env leak check | Env Leak Check | `node scripts/check-env-leak.mjs` |
| Secrets health | Critical Secrets Health Check | `npm run lint:secrets-critical` |
| Route sync | Verify Routes Guardrail | `npm run routes:sync` |
| Route security | Verify Route Security Guards | `npm run routes:verify-security` |
| Typecheck | Run typecheck | `npm run typecheck` |
| Lint | Run lint | `npm run lint` |
| Coverage gate | Run coverage gate | `npm run test:coverage` |
| Build | Build project | `npm run build` |
| Schema drift | Verify Schema Drift | `npm run db:verify` |
| Public API guardrails | Guardrails Public API | `node --import tsx scripts/guardrails-public-api.ts` |
| Clean worktree | Verify clean worktree | `git diff --quiet` |
| QA snapshots | Start Server & Run QA Snapshots | `npm run qa:snapshots` |

**Diferença entre status check e gate interno:**
- **Status check do GitHub** = item visível em Settings → Branches → Required status checks. O GitHub verifica diretamente se passou.
- **Gate interno** = step dentro de um job. Se o step falhar, o job falha, e o status check `Quality Gates` fica vermelho. O GitHub não enumera cada step individualmente como status check separado.

---

## Gates internos executados dentro do check Security

| Gate interno | Step | Comando |
|---|---|---|
| Dependency audit | Audit production dependencies | `npm audit --omit=dev --audit-level=high` |
| Lint | Lint | `npm run lint` |
| Release check (somente push em main) | Release Check | `npm run release:check` |

---

## Regras de merge

1. **PR obrigatória** — todo código deve chegar via PR, nunca por push direto em `main`.
2. **1 aprovação mínima** — de reviewer com acesso ao repositório.
3. **Code Owners** — caminhos listados em `.github/CODEOWNERS` exigem aprovação de `@catcaio`.
4. **Dismiss stale approvals** — aprovação é descartada automaticamente se novos commits forem adicionados após a aprovação.
5. **Branch up to date** — a branch da PR deve estar atualizada com `main` antes do merge.
6. **Todos os status checks verdes** — `Quality Gates`, `Dependency Audit`, `Lint & Release Check` e `Vercel` (se required) devem estar `pass`. Nenhum check pode estar `pending`, `failed` ou `skipped` sem justificativa explícita.
7. **Sem bypass por admin** — exceto em emergência documentada (ver seção abaixo).

---

## Regras para PRs P0 / security / runtime

PRs classificadas como P0 (criticidade máxima) ou que toquem superfícies de segurança, auth, tenant isolation, PII, billing, webhooks, migrations ou runtime crítico exigem:

- [ ] Revisão obrigatória (não basta CI verde).
- [ ] Evidência objetiva dos gates no body da PR (saída de CI ou link para run).
- [ ] Sem overclaim — body reflete apenas o que o diff realmente altera.
- [ ] **Merge bloqueado** se houver qualquer um dos seguintes:
  - falha em auth ou RBAC;
  - quebra de tenant isolation;
  - exposição de PII em log, snapshot ou resposta de API;
  - migration sem rollback plan documentado;
  - schema drift não resolvido;
  - webhook sem validação de assinatura;
  - rota sensível sem guard (`requireSession`, `requireAdmin`, etc.);
  - falha de route security guardrail.

---

## Emergências — bypass documentado

O bypass por admin (`--admin`) é permitido **somente** em situação de incidente ativo onde o delay de aprovação representa risco operacional maior.

Requisitos obrigatórios para bypass:
1. Criar issue de incidente imediatamente.
2. Documentar motivo do bypass no body do commit ou PR.
3. Abrir PR de follow-up para reverter ou corrigir a causa raiz.
4. Notificar `@catcaio` via canal operacional.

**Nunca usar bypass como atalho para evitar review em circunstâncias normais.**

---

## Nomeação de branches

| Prefixo | Uso |
|---|---|
| `feat/` | Nova feature de produto |
| `fix/` | Correção de bug |
| `chore/` | Infraestrutura, governança, CI (sem impacto em runtime) |
| `docs/` | Apenas documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Apenas testes |
| `hotfix/` | Correção crítica em produção |

---

## Superfícies frozen / deferred

Ver `docs/mvp-freeze-plan.md` e `.agents/rules/mvp-freeze.md`.  
PRs tocando superfícies frozen devem executar `npm run guardrail:mvp-freeze` e incluir `ALLOW_FROZEN_SURFACE_CHANGES=1` com justificativa explícita no body.

---

## Referências cruzadas

- CODEOWNERS: `.github/CODEOWNERS`
- PR template: `.github/PULL_REQUEST_TEMPLATE.md`
- Agent rules: `.agents/rules/`
- MVP Freeze: `docs/mvp-freeze-plan.md`
- PR Test Scope: `docs/pr-test-scope.md`

---

*Última revisão: 2026-05-17 | Owner: @catcaio | PR: #329*
