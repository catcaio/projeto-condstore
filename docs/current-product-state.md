# Estado Atual do CONDSTORE OS

> **Última Atualização:** 12 de Março de 2026

Este documento reflete a situação arquitetural e operacional real do sistema **CONDSTORE OS** no momento presente, diferenciando as funcionalidades já em uso daquelas configuradas, mas congeladas.

---

## 🟢 O que está em Produção (Pronto & Escalável)

O sistema hoje atua como um **CRM Operacional e Logístico B2B Assistido**. Toda a interação é liderada por operadores humanos, apoiados por integrações logísticas profundas.

### 1. Atendimento Humano (Inbox)
- Integração plena bidirecional com a Twilio (WhatsApp Business API).
- Cockpit de Atendimento (`/cockpit/atendimento`) permitindo recebimento e resposta em tempo real.
- Classificação de conversas por status (Aguardando Operador, Aguardando Cliente, Resolvido).
- Isolamento total por Tenant, exibição da timeline de conversas por cliente (Base de Contatos unificada).

### 2. Cotações de Frete Integradas
- A "Freight Engine" atua dentro do Chat: o operador consegue disparar simulações reais e enviar uma cotação formatada no WhatsApp (`/api/cockpit/conversations/[id]/quotes`).
- Integração simultânea com Tabelas Próprias Roteirizadas (Movvi, Mengue, Braspress) + Melhor Envio de contingência.

### 3. Pipeline CRM (Painel Kanban)
- As conversas convertem em Negócios rastreáveis na página de pipeline cruzada (`/cockpit/pipeline`).
- Estágios (`NEW`, `QUALIFYING`, `QUOTED`, `NEGOTIATING`, `WON`, `LOST`).
- O operador acompanha de ponta a ponta sem sair da plataforma.

### 4. Transformação (Quote → Order → Shipment)
- Link direto do CRM com ERP.
- Qualificando uma Cotação para `WON`, o sistema gera o Pedido (`Order`) no Kanban de Operações (`/cockpit/orders`).
- Movendo Pedidos para `CONFIRMED`, o Barramento reage e gera o fluxo Logístico Despachado (`Shipment`), habilitando a interface de tracking links para o vendedor reportar ao cliente.

### 5. Fundações (Security & Event Bus)
- Guardrails e Multi-tenant isolados perfeitamente (RLS application-level via Drizzle e Sessions).
- Events assíncronos (`order_created`, `shipment_delivered`, `webhook_processed`) transitando pelo **DOMINE Event Engine** via `sqs/pubsub` de DLQs.

---

## 🧊 O que está Congelado (Frank AI Runtime)

A identidade do **Frank** tem sua infraestrutura construída, porém **o runtime de respostas autônomas em nome do vendedor está desligado.**

### Motivo do Freeze
Para manter o rigorismo no SLA B2B logístico e nas interações complexas com empresas, priorizou-se garantir 100% da rastreabilidade da negociação comercial Humana através de CRMs maduros, antes de plugar o inferenciador AI no volante.

### Infraestrutura Pronta e Latente
- **Intent & Context Resolver:** Capacidade modular pronta para identificar intenções em texto livre (Track Order, Create Quote).
- **Playbook & Knowledge Engine:** Bases RAG construídas no backend (`/knowledge`, `chunks`, `collections`) para guidelines de regras de venda.
- **Tools Executor:** O bot tem permissões restritas (Supreme Governance) e scripts validados prontos para acionamentos restritos através do orchestrator.

---

## 🚀 Próximos Passos (Evolução Contínua)

1. **Expansão do Atendimento (Humano):**
   Melhorar macros, anexos, atalhos de sugestão rápida (copilotos passivos limitados apenas à UI do operador, sem responder sozinhos).

2. **Cockpit Analytics (Dashboards):** 
   Amadurecimento do *Pipeline Metrics Service*, transformando os Eventos Transitórios de Pedidos (OEB) em Dashboards interativos de Retenção e *Win/Loss Rate*.

3. **Automação Preditiva:**
   Utilizar a infraestrutura do Frank congelada para atuar em background como Auxiliar do Vendedor: etiquetando prioridades, marcando urgências ou sugerindo o Link do Pedido automaticamente na lateral da tela via socket.
