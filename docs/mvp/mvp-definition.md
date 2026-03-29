# MVP CONDSTORE OS — Definição oficial

**Status:** Lote 1 - Produção
**Data de consolidação:** 2026-03-29

---

## Definição em 1 frase

CONDSTORE OS é o cockpit onde o operador recebe o pedido no WhatsApp, cota o frete com múltiplos carriers e abre o pedido — na mesma tela, sem trocar de ferramenta.

---

## Definição em 1 parágrafo

O CONDSTORE OS centraliza três tarefas que hoje vivem em ferramentas separadas: receber e responder mensagens no WhatsApp com contexto do cliente, cotar frete com múltiplos carriers em tempo real, e criar e acompanhar o pedido até a entrega. O operador não precisa abrir planilha, ligar para a transportadora ou copiar dados entre sistemas. Tudo acontece dentro do cockpit, com histórico de cliente visível, e o pedido rastreável desde o momento em que é criado.

---

## O que o MVP faz

- **Inbox WhatsApp:** recebe mensagens via Twilio, exibe com histórico do cliente
- **Cotação multi-carrier:** consulta Melhor Envio API + carriers de tabela (Movvi, Mengue, Braspress) em paralelo
- **Criação de pedido:** converte cotação aprovada em order com um clique
- **Fila de logística:** acompanhamento de status até a entrega
- **Pipeline CRM:** Kanban de negociação por stage
- **Gestão de clientes:** histórico consolidado de pedidos e interações

---

## O que o MVP NÃO faz

- **Não responde automaticamente** — operador humano sempre aprova antes de enviar
- **Não integra com ERP** — é ferramenta operacional standalone
- **Não faz automação de IA** — não há respostas autônomas por inteligência artificial
- **Não gerencia estoque** — não integra com WMS ou sistema de inventário
- **Não emite nota fiscal** — não se integra com sistema de faturamento
- **Não dispara campanhas** — sem funcionalidade de broadcast de mensagens
- **Não opera sem operador** — requer decisão humana em cada etapa crítica

---

## ICP — Ideal Customer Profile

**ICP Principal:**
Distribuidora B2B atacadista que vende pelo WhatsApp e precisa cotar frete como parte do processo de venda.

| Dimensão | Critério |
|---|---|
| **Operadores** | 2–20 atendentes |
| **Volume de pedidos** | 20–500 pedidos/mês |
| **Modelo de frete** | Cota com 2+ carriers, negocia com cliente |
| **Situação atual** | Usa WhatsApp + planilha + site de carrier |
| **Complexidade operacional** | Processo manual, quer organizar sem ERP pesado |

**ICP Secundário:**
Revenda especializada (materiais de construção, insumos, peças industriais, produtos de condomínio) com 1–5 operadores.

**Quem NÃO é foco:**
- E-commerce D2C com fulfillment próprio
- Empresa sem vendas por WhatsApp
- Operação que quer automação total antes de ter processo manual claro
- Grande atacadista já integrada com ERP e TMS

---

## Proposta de valor

**Problema que resolve:**
Operador recebe pedido no WhatsApp, precisa cotar em outro sistema, criar pedido em outro, acompanhar entrega em outro. São 3–4 ferramentas para uma venda.

**Ganhos concretos:**
- Cotação de 15 minutos reduzida para <30 segundos
- Não perde pedido por demora em responder
- Operador vê histórico de cliente antes de responder
- Gestor tem visibilidade total de pedidos abertos

**Proposta principal:**
> Do WhatsApp ao pedido rastreado — sem sair do cockpit.

**Por que a supervisão humana é vantagem:**
- Operador mantém controle total — sabe o que saiu, quem aprovou, por quê
- Não há risco de automação errada comprometer relacionamento com cliente
- Velocidade + segurança = melhor que automação que falha
