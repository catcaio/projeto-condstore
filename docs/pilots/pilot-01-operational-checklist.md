# Checklist Operacional — Piloto 01 (Supervisionado)

Este checklist detalha os passos operacionais necessários para a execução do Piloto 01 do **CONDSTORE OS**. O foco é a validação do fluxo "Happy Path" com supervisão humana direta (Human-in-the-Loop), garantindo que cada transição de estado seja validada antes de avançar.

---

## BLOCO 1: Preparação do Ambiente e Tenant

- [ ] **Provisionamento de Tenant:** Criar o tenant exclusivo para o piloto (via `/api/internal/tenants`).
- [ ] **Isolamento de Dados:** Verificar se as variáveis de ambiente e o banco de dados estão isolados para o novo `tenantId`.
- [ ] **Configuração de Usuários:** Cadastrar os operadores do cliente com os papéis `OPERATOR` e `MANAGER`.
- [ ] **Configuração de Carriers:** Importar tabelas de frete ou configurar tokens de integração (ex: Melhor Envio).
- [ ] **CEP de Origem:** Validar se o `origin_cep` do tenant está configurado corretamente.

---

## BLOCO 2: Validação do Canal de Entrada (WhatsApp)

- [ ] **Conectividade Twilio:** Validar se o `TWILIO_ACCOUNT_SID` e `AUTH_TOKEN` estão ativos.
- [ ] **Webhook Health:** Verificar se a URL de webhook está respondendo (200 OK) e configurada no console da Twilio.
- [ ] **Teste de Recebimento:** Enviar mensagem de "Olá" pelo WhatsApp e confirmar a criação da conversa no Cockpit.
- [ ] **Sanitização de PII:** Verificar nos logs se o número de telefone está sendo tratado conforme as regras de privacidade (p0-7-pii-map).

---

## BLOCO 3: Simulação e Acompanhamento de Atendimento

- [ ] **Abertura de Conversa:** Operador abre a conversa no Cockpit.
- [ ] **Contexto do Cliente:** Verificar se o painel lateral carrega as informações básicas (mesmo que vazias para cliente novo).
- [ ] **Interação Inicial:** Operador responde a mensagem via Cockpit e confirma o recebimento no dispositivo do cliente.

---

## BLOCO 4: Geração e Envio de Cotação

- [ ] **Solicitação de Frete:** Operador clica em "Solicitar Cotação" dentro da conversa.
- [ ] **Dados de Destino:** Inserir CEP de destino real e dimensões/peso.
- [ ] **Cotação Multi-Carrier:** Verificar se o sistema retorna opções de diferentes transportadoras (ou tabela + Melhor Envio).
- [ ] **Envio ao Cliente:** Operador seleciona a melhor opção e envia para o WhatsApp.
- [ ] **Status da Cotação:** Verificar se a cotação foi salva com status `SENT`.

---

## BLOCO 5: Registro de Aceite e Aprovação

- [ ] **Confirmação do Cliente:** Simular ou aguardar o "OK" do cliente no WhatsApp.
- [ ] **Registro de Aprovação:** Operador clica em "Registrar Aprovação" no Cockpit.
- [ ] **Transição de Estado:** Confirmar que a cotação mudou para o status `ACCEPTED`.
- [ ] **Feedback UI:** Verificar se o Cockpit exibe a confirmação de aprovação sem recarregar a página.

---

## BLOCO 6: Confirmação de Pedido e Criação de Shipment

- [ ] **Conversão em Pedido:** Com a cotação aprovada, clicar em "Criar Pedido".
- [ ] **Status do Pedido:** Confirmar que o pedido nasceu como `DRAFT` ou `CREATED`.
- [ ] **Confirmação Final:** Operador usa a ação "Confirmar Pedido".
- [ ] **Abertura de Logística:** Confirmar que o `Shipment` foi criado automaticamente após a confirmação do pedido.

---

## BLOCO 7: Registro de Handoff e Logística

- [ ] **Fila de Logística:** Acessar o módulo de Logística e localizar o shipment criado.
- [ ] **Atribuição de Transportadora:** Verificar se a transportadora escolhida na cotação está vinculada corretamente.
- [ ] **Status Logístico:** Alterar status para `PROCESSING` para simular o início da operação física.

---

## BLOCO 8: Verificação de Cockpit e Métricas

- [ ] **Timeline Operacional:** Verificar se todas as ações (mensagem, cotação, pedido) aparecem na timeline da conversa.
- [ ] **Painel de Gestão:** Verificar se o pedido aparece nas métricas de "Pedidos do Dia".
- [ ] **Métricas de Tempo:** Validar se o tempo entre a primeira mensagem e a confirmação do pedido foi registrado.

---

## EVIDÊNCIAS ESPERADAS (Placeholder para Execução)

*Nota: Esta seção será preenchida durante a execução real. Não preencher com dados fictícios agora.*

1. **Screenshot: Inbox do Cockpit**
   - [ ] [Link para imagem/log do recebimento da mensagem]
2. **Screenshot: Painel de Cotação**
   - [ ] [Link para imagem da cotação gerada com múltiplas opções]
3. **Log de Transição: Cotação -> Pedido**
   - [ ] [Snippet de log ou screenshot do status ACCEPTED]
4. **Screenshot: Fila de Logística**
   - [ ] [Link para imagem do shipment confirmado]

---

## MINI-CASE: Template Before/After

**Empresa:** [Nome do Piloto]
**Data:** [Data do Piloto]

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
