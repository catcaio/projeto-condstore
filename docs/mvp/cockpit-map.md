# MVP CONDSTORE OS — Mapa do Cockpit operacional

**Descrição:** O que o operador vê, o que o gestor vê, quais ações cada um pode tomar.

---

## Visão geral

O cockpit é a interface unificada onde operadores e gestores executam o dia a dia do MVP. Não há automação invisível — tudo é controlado pelo usuário humano.

---

## Salas e responsabilidades

### 1. Inbox / Conversas

**O que o operador vê:**
- Lista de conversas WhatsApp ativas
- Mensagens da conversa
- Histórico do cliente ao lado (empresa, pedidos anteriores)
- Stage do cliente no pipeline (New / Quoted / Won)

**O que o operador faz:**
- Responde mensagem diretamente na tela
- Solicita cotação (simula frete multi-carrier)
- Atribui conversa a outro operador
- Muda stage do cliente (New → Quoted → Won)
- Visualiza histórico de todas as interações

**Dados que alimentam:**
- `conversations` (WhatsApp sessions)
- `messages` (encrypted)
- `customers` (company info, phone_hash)
- `crm_pipelines` (stages)

**APIs associadas:**
- `GET/POST /api/cockpit/conversations`
- `GET /api/cockpit/conversations/[id]/messages`
- `PATCH /api/cockpit/conversations/[id]` (stage change)

---

### 2. CRM / Pipeline

**O que o operador vê:**
- Kanban visual com colunas: New, Quoted, Won, Lost
- Cards de conversas agrupadas por stage
- Métrica: quantos clientes em cada stage

**O que o operador faz:**
- Arrasta card entre stages (manuais, sem automação)
- Clica em card para ver detalhes da conversa
- Acompanha progresso de negociação

**Dados que alimentam:**
- `conversations` + `crm_pipelines`
- Agregado no cockpit em tempo real

**APIs associadas:**
- `GET /api/cockpit/conversations` (com stage filter)
- `PATCH /api/cockpit/conversations/[id]` (stage update)

---

### 3. Cotação / Freight

**O que o operador vê:**
- Modal/drawer dentro do inbox com inputs de destino
- Após submissão: 2-3 opções de carrier com preço + prazo
- Opção selecionada fica destacada

**O que o operador faz:**
- Preenche CEP de destino
- Opcional: ajusta peso/dimensões
- Solicita cotação (chama freight engine)
- Seleciona melhor opção
- Clica em "Criar pedido" para converter em order

**Dados que alimentam:**
- `freight_simulations` (resultados de cotação)
- Carriers: Melhor Envio API + tabelas (Movvi, Mengue, Braspress)

**APIs associadas:**
- `POST /api/cockpit/conversations/[id]/quotes` (request cotação)
- `GET /api/cockpit/conversations/[id]/quotes` (retrieve resultados)
- `POST /api/cockpit/conversations/[id]/quotes/[quoteId]/order` (create order)

---

### 4. Pedidos

**O que o operador vê:**
- Lista de todos os orders abertos
- Status de cada um (CREATED, PROCESSING, DELIVERED)
- Itens do pedido (quantidade, descrição)
- Carrier selecionado
- Cliente vinculado

**O que o gestor vê:**
- Fila de pedidos com timeline
- Filtros por status, cliente, carrier
- Métricas: total de pedidos, AVG de valor, taxa de entrega

**O que o operador faz:**
- Confirma pedido (CREATED → PROCESSING)
- Visualiza timeline de status
- Consulta tracking do carrier
- Abre conversa associada

**Dados que alimentam:**
- `orders` (header)
- `order_items` (line items)
- `order_status_history` (timeline)
- `freight_shipments` (carrier info)

**APIs associadas:**
- `GET /api/cockpit/orders`
- `GET/PATCH /api/cockpit/orders/[id]`
- `GET /api/cockpit/orders/[id]/status-history`

---

### 5. Logística

**O que o operador de logística vê:**
- Fila de shipments em aberto
- Status atual de cada um
- CEP de destino, cliente, prazo
- Alertas de SLA vencido

**O que o gestor vê:**
- Dashboard com métricas: shipments em aberto, delivered/dia, exceptions
- Taxa de SLA cumprido
- Carrier com mais exceptions

**O que o operador faz:**
- Acompanha status em tempo real
- Clica para ver tracking do carrier
- Registra exceção manualmente (se necessário)
- Marca como delivered quando confirmado

**Dados que alimentam:**
- `freight_shipments` (carrier-specific shipments)
- `deliveries` (tracking)
- `order_status_history` (timeline)

**APIs associadas:**
- `GET /api/cockpit/logistica/shipments`
- `GET /api/cockpit/logistica/shipments/[id]/tracking`

---

### 6. Clientes

**O que o operador vê:**
- Lista de clientes (ordenada por últimas interações)
- Customer 360: pedidos anteriores, histórico de negociações, contatos
- Informações: company, phone_last4 (nunca exibe phone completo)

**O que o operador faz:**
- Busca cliente por nome/phone_last4
- Visualiza histórico completo
- Edita informações de contato
- Vê todos os pedidos do cliente

**Dados que alimentam:**
- `customers` (company info)
- `customer_contacts` (encrypted PII)
- `orders` (histórico de pedidos do cliente)
- `conversations` (histórico de interações)

**APIs associadas:**
- `GET /api/cockpit/clientes`
- `GET/PATCH /api/cockpit/clientes/[id]`
- `GET /api/cockpit/clientes/[id]/orders`

---

### 7. Configurações

**O que o admin vê:**
- Workspace config (nome, logo, fuso horário)
- Usuários e papéis (admin, manager, operator)
- Integração Twilio (status da conexão)
- Carriers configurados
- Campos customizados por tenant

**O que o admin faz:**
- Cria novos usuários
- Atribui papéis (admin, manager, operator)
- Ativa/desativa carriers
- Define campos customizados

**Dados que alimentam:**
- `tenants` (workspace config)
- `customer_accounts` (users)
- `custom_fields` (field definitions)
- Integração Twilio (status)

**APIs associadas:**
- `GET/PATCH /api/cockpit/config/workspace`
- `GET/POST /api/cockpit/config/users`
- `GET/POST /api/cockpit/config/custom-fields`

---

## Visão consolidada: O que cada papel vê

| Papel | Conversas | Pedidos | CRM | Logística | Clientes | Config |
|---|---|---|---|---|---|---|
| **Operador** | ✅ full | ✅ read | ✅ full | ✅ read | ✅ read | ❌ |
| **Gerente** | ✅ read | ✅ full | ✅ full | ✅ full | ✅ read | ❌ |
| **Admin** | ✅ read | ✅ read | ✅ read | ✅ read | ✅ read | ✅ full |

---

## Fluxo típico do operador (durante um dia)

```
08:00 - Abre cockpit
         ↓
08:05 - Vê 3 mensagens novas no Inbox
         ↓
08:10 - Abre primeira conversa
         Vê histórico do cliente
         Responde "Ok, deixa eu cotar para você"
         ↓
08:12 - Clica "Pedir cotação"
         Preenche CEP (já vem preenchido com dados do cliente)
         Clica "Consultar carriers"
         ↓
08:13 - Vê 3 opções: Melhor Envio R$150, Movvi R$145, Braspress R$160
         Seleciona Movvi
         Clica "Criar pedido"
         ↓
08:14 - Pedido criado, notifica cliente no WhatsApp
         "Ótimo! Saiu por Movvi. Segue o link de tracking: [URL]"
         ↓
08:15 - Repete com próximas 2 mensagens
         ↓
16:00 - Abre painel de Pedidos
         Vê que 15 saíram hoje
         Gestor avalia a produtividade
```

---

## Garantias do cockpit operacional

1. **Sem automação invisível** — operador sabe por que cada ação aconteceu
2. **Sem perda de contexto** — histórico do cliente sempre visível
3. **Sem troca de sistema** — tudo na mesma tela
4. **Sem perda de dados** — cada ação registrada com timestamp e autor
5. **Sem surpresas** — operador aprova antes de qualquer ação externa
