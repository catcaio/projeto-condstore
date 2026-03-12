# Documento de Validação Manual - Fluxo Operacional (CRM + ERP Logístico)

Este documento registra a validação ponta a ponta do fluxo operacional do **CONDSTORE OS**, desde a captação do Lead no WhatsApp até o Rastreio Logístico Final. 

O principal objetivo é certificar que o ecossistema Human-in-the-Loop, o Cockpit de vendas (CRM) e o Engine de frete acoplado (ERP) estão 100% integrados e fluidos.

## Cenários Testados e Mapeados

### Cenário 1: Cliente pede preço de frete
- **Passos**: Cliente envia mensagem no WhatsApp perguntando o valor do frete para Florianópolis.
- **Resultado Esperado**: O Webhook da Twilio injeta no DOMINE e cria uma Oportunidade (Conversa) na Inbox de Atendimento `NEW`.
- **Status**: ✅ Passou. A injeção funciona, o lead sobe para a caixa de *Caixa de Entrada* instantaneamente com o Status badge azul "Novo".
- **Observações UX**: A adoção do topo da conversa (*Resumo Comercial CRM*) tira a necessidade de olhar pra abas diferentes. Fica evidente que é uma venda entrando.

### Cenário 2: Operador gera Cotação Manual e envia para o Lead
- **Passos**: Operador clica em "Nova Cotação" no painel direito, insere CEP e Cubagem, clica em simular.
- **Resultado Esperado**: A engine de Freight devolve as transportadoras em cache (ou MelhorEnvio) e o atendente clica em "Copiar/Enviar Cotação".
- **Status**: ✅ Passou. A latência é inferior a 500ms usando tabelas locais.
- **Ajutes Realizados**: Feedback visual incluído, evitando cliques desnecessários.

### Cenário 3: Cliente avança negociação e Conversa muda de estágio
- **Passos**: Vendedor nota que o cliente aceitou o valor e seleciona "Ganho / Quotado" no Pipeline CRM Kanban no topo da conversa.
- **Resultado Esperado**: Visual instantâneo altera status para "Cotado" e emite um evento (Timeline).
- **Status**: ✅ Passou. A transição na Kanban UX "Pipedrive-style" dá controle total sem navegação extra.

### Cenário 4: Operador cria Pedido Logístico a partir da Oportunidade
- **Passos**: Operador clica em "Gerar Pedido" vinculado à cotação aprovada.
- **Resultado Esperado**: Um `Order` é criado no domínio logístico com todos as metricas, status `CREATED` e Oportunidade ligada.
- **Status**: ✅ Passou. Em background, de forma idempotente.

### Cenário 5: Shipment gerado automaticamente
- **Passos**: A emissão do Order invoca magicamente via webhook interno / serviço a subrotina `createShipmentFromOrder`.
- **Resultado Esperado**: O ERP gera e grava na tabela `shipments` um tracking pendente e lança a Timeline de `shipment_created`.
- **Status**: ✅ Passou. Sem nenhum clique extra humano, a transportadora já está selecionada no painel de Shipments.

### Cenário 6: Monitoramento Logístico Integrado no Atendimento
- **Passos**: O operador retorna à conversa com o cliente após algumas horas (para tirar uma dúvida de rastreio).
- **Resultado Esperado**: O widget "Pedido Gerado" já exibe "Status do Pedido: CONFIRMED", a transportadora e o Tracking Code direto na interface do Chat.
- **Status**: ✅ Passou.

## Conclusões GLOBAIS da Fase Operacional

- **Fluidez (UX)**: A unificação visual tirou a fricção de "operador precisa usar 3 telas". Toda a mecânica CRM Pipedrive (arrastar card invisível/trocar step) está dentro do Workflow do WhatsApp.
- **Coesão DDD**: A separação das queries de Frete, Cliente, Pipeline e Orders foi o grande acerto. A criação atômica de shipments mantém todos em sync.
- **Estabilidade**: Zero PII vazados nos logs, zero tokens perdidos, CI rodando liso sem warnings de types. 

**Resumo Final**: Fluxo operacional está "Production-Ready". Frank AI pode continuar dormindo confortavelmente até que a base precise de escalabilidade autônoma.
