# Tudico MVP Design (Fase D)

## Arquitetura mínima

```txt
Tudico Web Hub (/tudico)
  -> TudicoService
     -> ContextManager (master document + entities)
     -> ToolRegistry (7 tools obrigatórias)
     -> OutputProtocol (estrutura epistemológica)
     -> MemoryStore (tenant-scoped, in-memory seed)
```

## Stack fase 1

- **Store relacional/JSON mínimo**: em memória (seed versionado em TypeScript) para reduzir complexidade.
- **Banco vetorial**: adiado; substituído por indexação textual simplificada no master document.
- **Painel web**: página Next.js server component + client component de consulta.
- **API mínima**: `POST /api/tudico/query` tenant-scoped via headers de sessão.

## Modelo de armazenamento

`TudicoMemoryState` por `tenantId` contendo:

- metadados do documento mestre
- glossary entries
- claims
- versões de hipótese
- open questions
- inconsistencies
- bibliography

## Versionamento de hipótese

Cada versão contém:

- `id`
- `version`
- `summary`
- `changes`
- `createdAt`

Comparação retorna:

- versão base
- versão alvo
- itens adicionados
- itens removidos

## Claim registry

Claim com:

- `id`
- `statement`
- `status` (`estabelecido|plausível|conjectural|excessivo`)
- `evidenceRefs`
- `notes`

## Inconsistency board

Entrada com:

- `id`
- `description`
- `severity` (`low|medium|high`)
- `relatedClaimIds`
- `action`

## Fluxo de ingestão do documento mestre

1. Carregar markdown base (`docs/tudico/master-document.md`).
2. Extrair título, seções e resumo inicial.
3. Anexar metadata no `masterDocument` do estado.
4. Registrar log estruturado de ingestão.

## Tools mínimas implementadas

- `get_claim_status`
- `compare_hypothesis_versions`
- `fetch_glossary_term`
- `list_open_questions`
- `audit_response_for_extrapolation`
- `map_concept_dependencies`
- `summarize_regime_state`

## Painel inicial

Seções no hub `/tudico`:

- visão geral da frente
- estado atual do MVP em Rindler
- claims
- glossary
- inconsistências
- versões da hipótese
- perguntas em aberto
- formulário de consulta com protocolo epistemológico
