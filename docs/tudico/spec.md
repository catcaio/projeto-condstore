# Tudico MVP Spec (Fase S)

## Objetivo formal

O **Tudico** é um agente de pesquisa isolado para a frente **Estrutura Quântica-Relacional (Rindler)**. Ele atua como memória externa, curador de corpus, auditor conceitual e rastreador de hipóteses.

## Problema que resolve no MVP

- Evitar perda de contexto em iterações de estudo.
- Separar claramente fatos estabelecidos de hipóteses e extrapolações.
- Tornar rastreável a evolução de versões de hipótese.
- Permitir consulta rápida a claims, glossary, inconsistências e open questions.

## Non-goals (congelados neste MVP)

- Não integrar com Frank runtime/training.
- Não integrar com fluxos operacionais do CONDSTORE (CRM, frete, vendas, cockpit operacional).
- Não implementar coding-agent genérico.
- Não implementar multi-agent avançado.
- Não implementar knowledge graph sofisticado.

## Tipos de consulta suportados

1. **Status de claim**: validação epistemológica por claim.
2. **Comparação de versões**: mudanças entre versões de hipótese.
3. **Glossário**: definição e relações de termo.
4. **Perguntas em aberto**: pendências de investigação.
5. **Auditoria de extrapolação**: análise de risco epistemológico de resposta.
6. **Dependências de conceito**: cadeia de pré-requisitos entre conceitos.
7. **Resumo de regime**: estado atual por recorte temático.

## Contrato de entrada (query)

```ts
interface TudicoQueryInput {
  tenantId: string; // obrigatório, origem sessão
  query: string;
  tool?:
    | 'get_claim_status'
    | 'compare_hypothesis_versions'
    | 'fetch_glossary_term'
    | 'list_open_questions'
    | 'audit_response_for_extrapolation'
    | 'map_concept_dependencies'
    | 'summarize_regime_state';
  payload?: Record<string, unknown>;
}
```

## Contrato de saída (response)

```ts
interface TudicoResponse {
  protocol: {
    baseEstabelecida: string;
    leituraHipoteseAtual: string;
    auditoriaCritica: string;
  };
  epistemicBlocks: Array<{
    label: 'estabelecido' | 'plausível' | 'conjectural' | 'excessivo';
    content: string;
  }>;
  toolResult?: unknown;
  warnings: string[];
}
```

## Protocolo epistemológico obrigatório

Toda resposta deve conter, na ordem:

1. **Base estabelecida**
2. **Leitura da hipótese atual**
3. **Auditoria crítica**

E classificar conteúdo nos blocos:

- estabelecido
- plausível
- conjectural
- excessivo

## Entidades mínimas de base

- `master_document`
- `glossary`
- `claims`
- `hypothesis_versions`
- `open_questions`
- `bibliography_items`
- `inconsistencies`
