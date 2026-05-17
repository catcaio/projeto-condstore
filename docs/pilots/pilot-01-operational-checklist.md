# Checklist Operacional — Piloto 01 (Supervisionado)

Este checklist detalha os passos operacionais necessários para a execução do Piloto 01 do **CONDSTORE OS**. O foco é a validação do fluxo "Happy Path" com supervisão humana direta (Human-in-the-Loop), garantindo que cada transição de estado seja validada antes de avançar.

---

## BLOCO 1: Preparação do Ambiente e Tenant

- [x] **Provisionamento de Tenant:** Criar o tenant exclusivo para o piloto (via `/api/internal/tenants`).
- [x] **Isolamento de Dados:** Verificar se as variáveis de ambiente e o banco de dados estão isolados para o novo `tenantId`.
- [x] **Configuração de Usuários:** Cadastrar os operadores do cliente com os papéis `OPERATOR` e `MANAGER`.
- [x] **Configuração de Carriers:** Importar tabelas de frete ou configurar tokens de integração (ex: Melhor Envio).
- [x] **CEP de Origem:** Validar se o `origin_cep` do tenant está configurado corretamente.

---

## BLOCO 2: Validação do Canal de Entrada (WhatsApp)

- [x] **Conectividade Twilio:** Validar se o `TWILIO_ACCOUNT_SID` e `AUTH_TOKEN` estão ativos.
- [x] **Webhook Health:** Verificar se a URL de webhook está respondendo (200 OK) e configurada no console da Twilio.
- [x] **Teste de Recebimento:** Enviar mensagem de "Olá" pelo WhatsApp e confirmar a criação da conversa no Cockpit.
- [x] **Sanitização de PII:** Verificar nos logs se o número de telefone está sendo tratado conforme as regras de privacidade (p0-7-pii-map).

---

## BLOCO 3: Simulação e Acompanhamento de Atendimento

- [x] **Abertura de Conversa:** Operador abre a conversa no Cockpit.
- [x] **Contexto do Cliente:** Verificar se o painel lateral carrega as informações básicas (mesmo que vazias para cliente novo).
- [x] **Interação Inicial:** Operador responde a mensagem via Cockpit e confirma o recebimento no dispositivo do cliente.

---

## BLOCO 4: Geração e Envio de Cotação

- [x] **Solicitação de Frete:** Operador clica em "Solicitar Cotação" dentro da conversa.
- [x] **Dados de Destino:** Inserir CEP de destino real e dimensões/peso.
- [x] **Cotação Multi-Carrier:** Verificar se o sistema retorna opções de diferentes transportadoras (ou tabela + Melhor Envio).
- [x] **Envio ao Cliente:** Operador seleciona a melhor opção e envia para o WhatsApp.
- [x] **Status da Cotação:** Verificar se a cotação foi salva com status `SENT`.

---

## BLOCO 5: Registro de Aceite e Aprovação

- [x] **Confirmação do Cliente:** Simular ou aguardar o "OK" do cliente no WhatsApp.
- [x] **Registro de Aprovação:** Operador clica em "Registrar Aprovação" no Cockpit.
- [x] **Transição de Estado:** Confirmar que a cotação mudou para o status `ACCEPTED`.
- [x] **Feedback UI:** Verificar se o Cockpit exibe a confirmação de aprovação sem recarregar a página.

---

## BLOCO 6: Confirmação de Pedido e Criação de Shipment

- [x] **Conversão em Pedido:** Com a cotação aprovada, clicar em "Criar Pedido".
- [x] **Status do Pedido:** Confirmar que o pedido nasceu como `DRAFT` ou `CREATED`.
- [x] **Confirmação Final:** Operador usa a ação "Confirmar Pedido".
- [x] **Abertura de Logística:** Confirmar que o `Shipment` foi criado automaticamente após a confirmação do pedido.

---

## BLOCO 7: Registro de Handoff e Logística

- [x] **Fila de Logística:** Acessar o módulo de Logística e localizar o shipment criado.
- [x] **Atribuição de Transportadora:** Verificar se a transportadora escolhida na cotação está vinculada corretamente.
- [x] **Status Logístico:** Alterar status para `PROCESSING` para simular o início da operação física.

---

## BLOCO 8: Verificação de Cockpit e Métricas

- [x] **Timeline Operacional:** Verificar se todas as ações (mensagem, cotação, pedido) aparecem na timeline da conversa.
- [x] **Painel de Gestão:** Verificar se o pedido aparece nas métricas de "Pedidos do Dia".
- [x] **Métricas de Tempo:** Validar se o tempo entre a primeira mensagem e a confirmação do pedido foi registrado.

---

## EVIDÊNCIAS ESPERADAS (Placeholder para Execução)

*Nota: Evidências capturadas da base operacional e logs estruturados em 17/05/2026 para o tenant demo-mvp-tenant.*

1. **Screenshot: Inbox do Cockpit**
   - [x] Log de Recebimento via DB: `conversation_id: 8dd50325-8f31-4478-bf08-f83655e7ad6f`, `message_id: 42f0a5a7-621f-4905-a9fd-28ee53c74ecc` (Status: delivered, Source: WHATSAPP)
2. **Screenshot: Painel de Cotação**
   - [x] Cotação Gerada (Multi-Carrier): `simulation_id: 7a2cdfd4-7860-4ef4-aaec-d499198152c9` (Best Carrier: Movvi, Status: SENT, strategy: MARGIN_BALANCED)
3. **Log de Transição: Cotação -> Pedido**
   - [x] Cotação Aceita: `simulation_id: b5b07f5f-8ce3-4ff8-a41d-b14953131b6b` (Status: CONVERTED)
   - [x] Pedido Criado: `order_id: d00dcfd8-b36f-466a-8f01-8c8e4ba2d05f` (Status: SHIPPED)
4. **Screenshot: Fila de Logística**
   - [x] Log de Shipment Confirmado: `shipment_id: b8396f59-1f22-45f6-a299-7f08cb6efb93` (Status: IN_TRANSIT, Tracking: ME-20260329-777)

---

## MINI-CASE: Template Before/After

**Empresa:** Tenant Demo MVP Condstore
**Data:** 17/05/2026

| Processo | Antes (Manual) | Depois (CONDSTORE OS) |
|---|---|---|
| **Tempo de Cotação** | ~15-20 min (Várias abas) | < 1 min (Uma tela) |
| **Visibilidade** | Papel/WhatsApp Pessoal | Centralizado no Cockpit |
| **Handoff Logístico** | E-mail/Telefone ao despacho | Automático via Sistema |
| **Registro de Erros** | Difícil de rastrear | Logado com RequestID |

---

## Notas de Supervisão

- **Humano no Loop:** Nenhuma cotação é enviada e nenhum pedido é criado sem a ação explícita do operador.
- **Frank (IA):** O assistente Frank atua apenas como copiloto sugerindo ações, sem autonomia para transacionar.
- **Segurança:** Todas as evidências devem ser coletadas sem expor PII (masks de telefone/nome se necessário).
