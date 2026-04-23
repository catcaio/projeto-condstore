# Tudico Fase 2 — Design (D)

## Arquitetura incremental

- Persistência em `tenant_configurations` com categoria `tudico` (tenant-scoped, sem expansão de schema nesta fase).
- Módulo backend em `src/modules/cockpit/tudico/*`.
- API em `src/app/api/cockpit/tudico/*`.
- Painel mínimo em `src/app/(app)/cockpit/tudico/*`.

## Módulos

1. `hypothesis versioning`
   - lista/cria versões sequenciais.
2. `hypothesis diff`
   - compara claims adicionadas/removidas/alteradas.
3. `paper cards`
   - lista cards + busca individual.
   - seed inicial com papers-base.
4. `inconsistency board`
   - log de inconsistência e listagem por claim.
5. `epistemic audit`
   - auditoria heurística de resposta em runtime.

## Tools obrigatórias

- `audit_response`
- `log_inconsistency`
- `compare_hypothesis_versions`
- `list_paper_cards`
- `get_paper_card`
- `list_claim_conflicts`
- `validate_statistical_signal` (MPV-56: validação estatística com p-value e intervalo de confiança)

Todas expostas via `POST /api/cockpit/tudico/tools`.

## Estados mínimos do board

- `open` -> `triaged` -> `reconciled`
- `dismissed` para conflito inválido.

## Relações

- claim <-> paper card (`claimIds[]`)
- inconsistency -> claim + paper
- nova versão de hipótese referencia versão anterior (`previousVersionId`).

## UX mínima no painel

- visão de versões;
- ação de diff das últimas versões;
- lista de paper cards;
- lista de inconsistências;
- ação de auditoria epistemológica.
