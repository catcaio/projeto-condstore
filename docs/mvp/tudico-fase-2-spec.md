# Tudico Fase 2 — Spec (S)

## Objetivo

Evoluir o Tudico para uma base de curadoria epistemológica com rastreabilidade explícita entre hipótese, claim, referência, inconsistência e revisão.

## Non-goals

- Sem integração com Frank runtime.
- Sem integração com operação CONDSTORE (WhatsApp/CRM/frete).
- Sem knowledge graph avançado.
- Sem dashboard complexo.

## Contratos novos (congelados)

### Hypothesis Version

- `id`, `version`, `title`, `summary`, `rationale`
- `claims[]` com nível epistemológico (`evidence`, `inference`, `speculation`)
- `previousVersionId`
- `createdBy`, `createdAt`

### Paper Card

- `id`, `slug`, `title`, `authors`, `year`, `sourceUrl`
- `summary`, `mechanisms[]`, `limitations[]`
- `claimIds[]` e `referenceClass` (`primary`, `secondary`, `derived`)

### Inconsistency Board Item

- `id`, `claimId`, `paperId`, `title`, `description`
- `status` (`open`, `triaged`, `reconciled`, `dismissed`)
- `severity`, `openedBy`, `openedAt`, `resolution`, `resolvedAt`

### Auditoria epistemológica runtime

- tool `audit_response` com alertas para:
  - linguagem inflada;
  - analogia tratada como mecanismo;
  - viés de confirmação;
  - mistura de níveis epistemológicos sem segregação.

## Critérios de classificação

- Claim deve declarar `level`.
- Referência em paper card deve declarar `referenceClass`.
- Inconsistência deve apontar no mínimo `claimId` + `paperId`.

## Fluxo obrigatório

`claim -> referência (paper card) -> conflito (inconsistency board) -> revisão (nova versão de hipótese)`

## Entregáveis de Fase 2

- versionamento formal de hipóteses;
- diff entre versões;
- paper cards mínimos populados;
- inconsistency board funcional;
- auditoria epistemológica operacional;
- navegação mínima no painel do Tudico.
