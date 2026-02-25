# P0-7 PII Map (phone/body)

Mapeamento inicial (PASSO 0) dos pontos que persistem/usam telefone e conteúdo sensível.

## Tabelas / Colunas (antes do cutover)

- `messages`
  - `from_phone` (telefone do cliente, plaintext legado)
  - `to_phone` (número do tenant/Twilio)
  - `body` (conteúdo da mensagem, plaintext legado)
  - `raw_payload` (sanitizado no webhook; não persiste `Body`)
- `freight_funnel_events`
  - `phone_number` (telefone do cliente, plaintext legado)

## Pontos de escrita

- `src/app/api/webhook/route.ts`
  - chama `messageRepository.saveInboundMessage(...)` com `fromPhone`, `toPhone`, `body`
  - aciona `freightController.handleIncoming(...)` que persiste eventos de funil via repositório
- `src/modules/funnel/funnel.repository.ts`
  - `saveEvent(...)` grava `freight_funnel_events.phone_number`

## Pontos de leitura / lookup

- `src/infra/repositories/message.repository.ts`
  - `getLastMessages(...)` buscava por `(tenantId, fromPhone)` e lia `body`
- `src/infra/context-cache.ts`
  - usa Redis key com `phoneHash`, mas fallback DB chamava `getLastMessages(...)` com telefone normalizado (plaintext legado)

## Observabilidade / logs (PII hardening)

- `src/infra/log/logger.ts`
- `src/infra/logger.ts`
- `src/infra/observability/sentry.ts` (redaction de `phone|message|body` já existente e mantida)

## Estratégia aplicada neste P0-7

- Dual-write:
  - `phone_hash`, `phone_encrypted` (mensagens e funil)
  - `body_encrypted` (mensagens)
- Cutover de lookup:
  - `messages` por `phone_hash` com fallback legado temporário
- Backfill:
  - job interno protegido para preencher campos novos e redigir plaintext legado
- Retenção:
  - cleanup anonimiza/remoção de PII antiga por policy
