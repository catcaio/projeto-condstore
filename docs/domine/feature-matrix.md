# DOMINE V1: Matriz de Features e Priorização

Esta matriz consolida a análise competitiva do Olist (Foco em Vendas e Logística) e RD Station (Foco em Conversas e CRM) contra a capacidade proposta no CONDSTORE OS, baseando-se no motor de processamento assíncrono DOMINE.

## 1. Classificação de Prioridade (Critérios)

- **P0:** Core do sistema, segurança, estabilidade, entrega do produto base.
- **P1:** Automação que poupa tempo humano (Core loop do usuário).
- **P2:** Funcionalidades para "Delight" da experiência e otimização avançada.
- **P3:** Perfumaria, integrações extras ou nichos muito específicos.

## 2. Matriz de Funcionalidades por SALA do Cockpit

### SALA: Operações & Logística (Olist Benchmark)
| Funcionalidade | Benchmark | Decisão | Prioridade | Implementação (DOMINE / Cockpit) |
|---|---|---|---|---|
| Automação de Cotação de Fretes | Olist Envios | Implementar | **P0** | Evento: `freight_quote.requested` | 
| Impressão Direta (Printnode) | Olist | Depende do Tenant | **P2** | Produto Pago: Adicional de Impressão Lote | 
| Importação Automática de Pedidos | Olist | Implementar | **P1** | Evento: `order.imported` + Tile: *"Sincronizações"* |
| Integração Multi-transportadora | Olist | Implementar | **P0** | Integration: Kangu / Correios / Jadlog |
| Sincronização de Estoque Global | Olist | Não (V1) | **P3** | Arquitetura focada em frete primeiro. |

### SALA: Inbox & Atendimento (RD Station Benchmark)
| Funcionalidade | Benchmark | Decisão | Prioridade | Implementação (DOMINE / Cockpit) |
|---|---|---|---|---|
| ID da Conversa / Ticket único | RD Station | Implementar | **P0** | Tile: *"Inbox"* / Backend Models |
| Integração WhatsApp Oficial | RD Station | Implementar | **P0** | Integration: Twilio / Meta API |
| Respostas e Variaveis Rápidas | RD Station | Implementar | **P1** | Tile: *"Templates de Atendimento"* |
| Transferência e Fila de Operador | RD Station | Implementar | **P1** | Tile: *"Equipe Inbox"* |
| Envio de Campanhas em Massa | RD Station | Produto Pago | **P2** | Produto Pago (Créditos Stripe) |
| Nuvem de Palavras / Sentimento | RD Station | Depende (Copilot) | **P3** | Cockpit Tile / API OpenAI |

### SALA: Inteligência & Bot (Copilot)
| Funcionalidade | Benchmark | Decisão | Prioridade | Implementação (DOMINE / Cockpit) |
|---|---|---|---|---|
| Triagem e IA Qualificadora | RD Station | Implementar | **P0** | Evento: `message.received` -> `bot.eval` |
| Automação de Resumo de Lead | RD Station | Implementar | **P1** | Evento: `lead.summarized` |

### SALA: Financeiro & Faturamento
| Funcionalidade | Benchmark | Decisão | Prioridade | Implementação (DOMINE / Cockpit) |
|---|---|---|---|---|
| Billing Transacional & Limites | Olist | Implementar | **P0** | Integration: Stripe / Vercel KV Rate Limits |
| Antecipação de Recebíveis | Olist | Não | **P3** | Foge do Core da aplicação no momento |

---

## 3. Desdobramento Arquitetural (Como aplicar?)

### O que vira DOMINE Event (Assíncrono via DLQ)
Processos lentos ou intensos que não devem travar a API pública ou a UX do operador.
- Eventos de mensagem recebida do WhatsApp.
- Confirmação de pagamento via Stripe.
- Geração ou sincronização de nota fiscal.
- Disparos de campanha em lote (broadcast).

### O que vira Cockpit Tile (Módulo RBAC do Front)
Acessos que os operadores precisam visualizar/gerenciar manualmente.
- Inbox (Gestão de tickets).
- Painel de Templates e Atendimento Inteligente.
- Painel de Custos (FinOps).
- Painel Logístico (Tracking).

### O que vira Produto Pago (Plano SaaS)
- Disparos em massa no WhatsApp (Mensagens ativas).
- Impressão térmica em nuvem e automação de separação de galpão.
- Dashboards analíticos muito granulares.

### O que exige Integração Externa
- WhatsApp: Twilio ou Meta Cloud API.
- Financeiro: Stripe Billing e Stripe Webhooks.
- Armazenamento (Notas Fiscais): S3 Buckets / R2.
- Logística: Kangu, Melhor Envio, Loggi.
