# Cotação Pública (Fundação)

## Visão Geral
Este módulo permite que usuários anônimos simulem cotações de frete sem necessidade de login. Para suportar isso de forma segura e em conformidade com a LGPD, o módulo foca em captar apenas intenções de cotação com dados limitados.

## Fluxo de Uso
1. Usuário acessa `/cotacao` e preenche o formulário básico (CEP origem, CEP destino, peso, dimensões, seguro, formato).
2. O submete para `POST /api/public/cotacao/intent`.
3. O endpoint executa sanitização e restrições de rate limit:
    - Rejeita campos abusivos.
    - Remove dados confidenciais (PII) extra.
    - Rate Limit 1: 10 requisições / minuto / IP.
    - Rate Limit 2: 100 requisições / dia / IP.
4. Identidade anônima é resolvida:
    - Se não existir, gera id anônimo em cookie (`condstore_anon`).
    - Resolve token de attribution (`condstore_attr`) ou cria um registro local usando as UTMs providenciadas na intent.
5. Fato estratégico gravado: `quote_intent_created` persistido na tabela `public_events`.
6. Retorna `{ intentId, next: "upgrades_pending" }`. O Front-end exibe mensagem de sucesso.

## Proteção e LGPD
- **Sem PII Bruta**: Nomes, telefones, ou e-mails submetidos nas UTMs/metadata são limpos.
- **Rastreamento Controlado**: IDs anônimos (`anonId`) e hashes de IP (`ipHash`, `uaHash`) evitam o vazamento de dados de rastreamento no evento `public_events`.

## Contrato de Adapters (Carriers)
Foi criada a fundação de tipos em `src/modules/shipping/carriers/types.ts`:
- `QuoteInput`
- `NormalizedQuote`
- `CarrierHealth`
- `CarrierAdapter` 

Stubs (placeholder) também definidos em `quote-engine/normalize.ts` e `quote-engine/rank.ts`.

## Próximos Passos (Checklist)
Para evolução do motor de cotação pública:
- [ ] Implementar CarrierAdapters reais (ex: CorreiosAdapter, LalamoveAdapter).
- [ ] Implementar a lógica real dentro de `normalizeQuotes` usando os schemas dos provedores.
- [ ] Implementar a lógica real dentro de `rankQuotes` visando priorização.
- [ ] Expandir o endpoint de intenção para paralelizar a busca pelas respostas dos Carriers.
- [ ] Conectar os resultados devolvidos no frontend (`/cotacao`).
