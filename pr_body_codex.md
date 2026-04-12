## Resumo
- fecha a consistencia operacional do cockpit de atendimento no fluxo supervisionado do MVP
- remove CTAs e blocos bloqueantes que sugeriam caminhos alternativos ao fluxo real
- padroniza feedback inline de sucesso/erro com `requestId` visivel quando a API devolve erro

## Escopo fechado
- `src/app/(app)/cockpit/atendimento/atendimento.client.tsx`
- `src/app/(app)/cockpit/atendimento/components/freight-quote-panel.tsx`
- `src/app/(app)/cockpit/atendimento/components/order-shipment-panel.tsx`
- `src/app/(app)/cockpit/atendimento/components/inline-action-feedback.tsx`

## O que mudou
- substitui o pipeline livre por um guia de fluxo supervisionado com proximo passo operacional
- remove `alert`, `confirm`, `prompt` e `window.location.reload()` do fluxo de atendimento
- cria feedback inline reutilizavel para chat, cotacao, pedido e identificacao de cliente
- exige leitura correta do fluxo `WhatsApp -> cotacao -> aprovacao -> pedido DRAFT -> confirmacao -> shipment`
- faz refresh de contexto apos envio, aprovacao de sugestao, identificacao de cliente, simulacao/envio de cotacao, criacao de pedido e confirmacao
- deixa o painel de pedido/shipment sempre visivel para orientar o operador mesmo sem pedido criado

## Evidencias objetivas
- `npm run scope:pr-tests -- --files "src/app/(app)/cockpit/atendimento/atendimento.client.tsx" "src/app/(app)/cockpit/atendimento/components/freight-quote-panel.tsx" "src/app/(app)/cockpit/atendimento/components/order-shipment-panel.tsx" "src/app/(app)/cockpit/atendimento/components/inline-action-feedback.tsx"` -> sugeriu `guardrail:mvp-freeze`, `test:whatsapp`, `lint`, `typecheck`, `test:cockpit`
- `npm run guardrail:mvp-freeze` -> OK
- `npm run lint` -> OK
- `npm run typecheck` -> OK
- `npm run test:whatsapp` -> OK
- `npm run test:cockpit` -> OK
- `npm run test:mvp` -> OK

## Riscos residuais
- o fluxo de aprovacao comercial ainda depende da leitura do operador sobre a resposta do cliente no WhatsApp; o backend nao persiste uma etapa dedicada de "approval" antes da conversao
- os testes de cockpit continuam emitindo warnings esperados de ambiente (`DATABASE_URL` ausente para augment de badges), sem falha de suite
- existem mudancas locais nao relacionadas ja presentes na branch de trabalho; este commit manteve o diff restrito ao atendimento
