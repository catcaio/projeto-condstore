# Branch Protection — CONDSTORE OS

> **Documento normativo.** Descreve as regras de proteção da branch `main` e o processo obrigatório para merge de PRs. Não altere sem revisão de @catcaio.

---

## Branch: `main`

### Regras ativas (configurar em Settings → Branches → Branch protection rules)

| Regra | Valor |
|---|---|
| Require a pull request before merging | ✅ enabled |
| Required approvals | 1 (mínimo) |
| Dismiss stale reviews when new commits are pushed | ✅ enabled |
| Require review from Code Owners | ✅ enabled (CODEOWNERS ativo) |
| Require status checks to pass before merging | ✅ enabled |
| Require branches to be up to date before merging | ✅ enabled |
| Do not allow bypassing the above settings | ✅ enabled (incluindo admins) |
| Allow force pushes | ❌ disabled |
| Allow deletions | ❌ disabled |

### Status checks obrigatórios

Os seguintes jobs do CI devem estar verdes antes de qualquer merge:

| Check | Workflow |
|---|---|
| `typecheck` | `.github/workflows/ci.yml` |
| `lint` | `.github/workflows/ci.yml` |
| `test` | `.github/workflows/ci.yml` |
| `build` | `.github/workflows/ci.yml` |

> **Nota:** Verificar periodicamente em Settings → Branches se os checks estão listados como "required". O GitHub só oferece checks que já executaram ao menos uma vez.

---

## Regras de nomeação de branch

| Prefixo | Uso |
|---|---|
| `feat/` | Nova feature de produto |
| `fix/` | Correção de bug |
| `chore/` | Infraestrutura, governança, CI, deps sem impacto em runtime |
| `docs/` | Apenas documentação |
| `refactor/` | Refatoração sem mudança de comportamento |
| `test/` | Apenas testes |
| `hotfix/` | Correção crítica em produção |

**Nunca commitar diretamente em `main`.** Toda mudança deve passar por PR com ao menos 1 aprovação.

---

## Processo de PR obrigatório

1. Abrir PR usando o template `.github/PULL_REQUEST_TEMPLATE.md`
2. Preencher **Tipo de mudança**, **Escopo Real**, **Checklist** e **Issues fechadas**
3. Aguardar CI verde em todos os checks obrigatórios
4. Obter aprovação de pelo menos 1 reviewer (CODEOWNERS automático para paths protegidos)
5. Executar `npm run guardrail:mvp-freeze` se a branch tocar superfícies de produto
6. Merge somente após todos os gates acima satisfeitos

---

## CODEOWNERS — paths críticos

Ver `.github/CODEOWNERS` para a lista completa de ownership por path.
Mudanças nos paths listados exigem revisão explícita de `@catcaio`.

---

## Superfícies frozen / deferred

Ver `docs/mvp-freeze-plan.md` e `.agents/rules/mvp-freeze.md` para a lista de superfícies congeladas. PRs tocando superfícies frozen devem usar `ALLOW_FROZEN_SURFACE_CHANGES=1` com justificativa explícita no body.

---

*Última revisão: 2026-05-17 | Owner: @catcaio*
