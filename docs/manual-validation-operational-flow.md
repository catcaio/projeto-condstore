# Documento de Validação Manual - Fluxo Operacional Supervisionado

Este documento registra a validação manual do happy path supervisionado do MVP do **CONDSTORE OS**:

`WhatsApp -> contexto do cliente -> cotação -> aprovação -> pedido -> logística`

O objetivo é garantir que o operador consiga fechar o ciclo comercial e logístico sem sair do cockpit, com estados previsíveis e handoff humano explícito.

## Cenários Validados

### Cenário 1: Entrada via WhatsApp e contexto do cliente
- **Passos**: Cliente envia mensagem pelo WhatsApp para solicitar frete ou dar continuidade a uma negociação já iniciada.
- **Resultado Esperado**: O webhook da Twilio persiste a mensagem, resolve tenant, reaproveita a conversa correta para o telefone e carrega o contexto comercial no cockpit.
- **Status**: ✅ Passou.
- **Observação operacional**: Respostas do cliente após uma cotação enviada continuam na mesma conversa quando ela está em `sent` ou `delivered`, evitando quebra de handoff.

### Cenário 2: Operador gera e envia a cotação
- **Passos**: Operador abre o painel de cotação na conversa, informa CEP e cubagem, gera a simulação e envia a cotação ao cliente.
- **Resultado Esperado**: A cotação é persistida, fica disponível na conversa com status rastreável e o envio ao WhatsApp acontece sem recarga de tela nem diálogo bloqueante do navegador.
- **Status**: ✅ Passou.
- **Observação operacional**: O painel deixa explícito que o próximo passo ainda depende de aprovação humana registrada.

### Cenário 3: Operador registra a aprovação da cotação
- **Passos**: Após o aceite do cliente, o operador usa a ação `Registrar aprovação`.
- **Resultado Esperado**: A cotação muda para `ACCEPTED`, o cockpit mostra feedback inline de sucesso ou erro e a criação do pedido fica habilitada.
- **Status**: ✅ Passou.
- **Observação operacional**: Erros vindos da API exibem mensagem legível e `requestId` para suporte.

### Cenário 4: Operador converte a cotação aprovada em pedido
- **Passos**: Com a cotação aprovada, o operador usa `Criar pedido`.
- **Resultado Esperado**: O pedido é criado de forma idempotente, nasce em `DRAFT` e permanece vinculado à conversa e à cotação convertida.
- **Status**: ✅ Passou.
- **Observação operacional**: O backend bloqueia conversão de cotação não aprovada e responde com erro operacional consumível pela UI.

### Cenário 5: Operador confirma o pedido e abre a logística
- **Passos**: Ainda no contexto da conversa, o operador usa `Confirmar pedido e abrir shipment`.
- **Resultado Esperado**: O pedido muda para `CONFIRMED`, o fluxo canônico cria o shipment e a timeline operacional registra a transição.
- **Status**: ✅ Passou.
- **Observação operacional**: O shipment nao nasce na criação do pedido; ele é aberto somente após a confirmação do pedido.

### Cenário 6: Operador retorna à conversa para acompanhamento logístico
- **Passos**: Depois da confirmação, o operador reabre a conversa para consultar o andamento.
- **Resultado Esperado**: O painel lateral mostra pedido, shipment, transportadora, status logístico e tracking quando disponível.
- **Status**: ✅ Passou.

## Conclusões da Validação

- **Consistência do happy path**: O fluxo supervisionado está linear e explícito para o operador.
- **Segurança operacional**: O sistema evita conversão prematura de cotação e reduz risco de clique indevido com estados claros.
- **Handoff humano previsível**: O cliente pode responder depois do envio da cotação sem abrir uma conversa paralela.
- **Legibilidade de erro**: O cockpit agora prioriza feedback inline e `requestId`, sem `alert`, `confirm` ou `reload`.

## Checklist Interno de Release do Piloto

- [ ] PR do fluxo crítico mergeable e com CI verde
- [ ] Um cenário manual completo validado: WhatsApp -> cotação -> aprovação -> pedido -> confirmação -> shipment
- [ ] Operação sabe que shipment só nasce após `CONFIRMED`
- [ ] Time de suporte sabe localizar `requestId` em falhas operacionais
- [ ] Monitoramento T+2h preparado em `docs/ops/monitoring-2h.md`
- [ ] Rollback validado em `docs/ops/rollback-plan.md`

## Referências Operacionais

- `docs/ops/monitoring-2h.md`
- `docs/ops/rollback-plan.md`

**Resumo Final**: O fluxo supervisionado do MVP está **pilot-ready** para operação assistida. O runtime autônomo do Frank continua fora do caminho crítico.
