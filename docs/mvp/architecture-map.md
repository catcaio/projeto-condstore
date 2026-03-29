# MVP CONDSTORE OS — Arquitetura funcional

**Descrição:** Visão estrutural do MVP sem detalhar implementação interna. Enfoque em fluxos e responsabilidades.

---

## Fluxo principal: Lead → Pedido → Entrega

```
[A] Lead via WhatsApp
    ↓
[B] Inbound Orchestrator (atendimento)
    ↓ (identity-resolver)
[C] Contexto do cliente carregado
    ↓
[D] Operador solicita cotação (dentro da conversa)
    ↓
[E] Freight Engine (multi-carrier)
    ├─ Melhor Envio API
    └─ Carriers de tabela (Movvi, Mengue, Braspress)
    ↓
[F] Simulations retornadas (2-3 opções)
    ↓
[G] Operador seleciona e converte em pedido
    ↓
[H] Order criado (CREATED → PROCESSING → DELIVERED)
    ↓
[I] Shipment linkado ao pedido
    ↓
[J] Logística acompanha até entrega
    ↓
[K] Cockpit mostra status em tempo real
```

---

## Etapas detalhadas

### [A] Lead via WhatsApp

- **Entrada:** Mensagem Twilio (From, Body, WaId, ProfileName)
- **Tecnologia:** Twilio Business API webhook
- **Responsabilidade:** receber e validar assinatura Twilio
- **Saída:** payload normalizado para orquestrador

### [B] Inbound Orchestrator

- **Módulo:** `src/modules/atendimento/`
- **Responsabilidade:** decidir o que fazer com a mensagem (ACK_ONLY / SUPERVISED_NO_REPLY)
- **Saída:** conversa criada/atualizada, message persistida

### [C] Contexto do cliente

- **Módulo:** `src/modules/customers/` (identity-resolver)
- **Responsabilidade:** resolver ou criar cliente baseado em phone_hash
- **Saída:** customer object com histórico

### [D] Solicitação de cotação

- **Local:** dentro do inbox WhatsApp (UI)
- **Responsabilidade:** operador clica em "Pedir cotação"
- **Entrada:** dados do pedido (itens, destinatário)

### [E] Freight Engine

- **Módulo:** `src/modules/shipping/` + `src/modules/freight/`
- **Responsabilidade:** consultar múltiplos carriers em paralelo
  - Melhor Envio API (real-time)
  - Movvi, Mengue, Braspress (tabelas pré-carregadas)
- **Dependência:** CEP de destino válido
- **Saída:** lista de simulações com preço + prazo

### [F] Simulações retornadas

- **Formato:** JSON com top 3 opções ranqueadas por preço/prazo
- **Visibilidade:** exibida no inbox, dentro da conversa do cliente
- **Seleção:** operador clica na opção preferida

### [G] Conversão em pedido

- **Ação:** clique em "Criar pedido" na simulação selecionada
- **Módulo:** `src/modules/orders/`
- **Resultado:** order criado com status CREATED

### [H] Lifecycle do pedido

| Status | Responsável | Trigger |
|---|---|---|
| **CREATED** | sistema | ao converter cotação |
| **PROCESSING** | logística | prep de shipment |
| **DELIVERED** | carrier | tracking finalizado |

### [I] Shipment linkado

- **Módulo:** `src/modules/shipments/`
- **Responsabilidade:** linkage order → carrier shipment
- **Resultado:** freight_shipment criado, tracking disponível

### [J] Logística acompanha

- **Módulo:** `src/modules/logistica/`
- **Responsabilidade:** fila de shipments, SLA, exceções
- **Visibilidade:** painel logístico com todos os abertos

### [K] Cockpit mostra status

- **Módulo:** `src/modules/cockpit/` + `/api/cockpit/*`
- **Responsabilidade:** agregar dados de todos os domínios
- **Visibilidade:** gestor vê inbox, CRM, pedidos, logística em tempo real

---

## Módulos do MVP — responsabilidades simplificadas

| Módulo | Responsabilidade |
|---|---|
| **atendimento** | Orquestração WhatsApp inbound, conversation lifecycle |
| **customers** | Resolução de identidade, histórico de cliente |
| **conversas** | UI do inbox WhatsApp |
| **orders** | Lifecycle de pedido CREATED→DELIVERED |
| **freight** | Quote engine, carrier routing, packing |
| **shipping** | Carrier adapters, ConcurrentQuoteEngine runtime |
| **shipments** | Persistência de shipments, linkage order→shipment |
| **logistica** | UI de logística, fila de acompanhamento |
| **crm** | Pipeline management, Kanban |
| **cockpit** | Dashboard operacional, agregação de dados |
| **cotacao-publica** | API pública de cotação (sem auth) |

---

## Dependências externas críticas

| Dependência | Tipo | O que acontece se falhar |
|---|---|---|
| **Twilio** | Serviço externo | Webhooks de WhatsApp não chegam |
| **Melhor Envio API** | Serviço externo | Apenas carriers de tabela disponíveis |
| **Banco de dados** | Infraestrutura | Pedidos e conversas não persistem |
| **Redis** | Infraestrutura | Event bus desacelera, fila pode acumular |

---

## Características arquiteturais do MVP

- **Multi-tenant por design** — isolamento a nível de aplicação via JWT + tenant_id
- **Operador humano no centro** — sem automação de resposta
- **Supervisão obrigatória** — toda ação crítica requer aprovação do operador
- **Event-driven internamente** — DOMINE para async processing (invisível para o operador)
- **PII criptografado** — phone, email, address sempre encriptados em repouso
