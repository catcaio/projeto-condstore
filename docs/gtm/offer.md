# CONDSTORE OS — Oferta Comercial

> **Consolidado em:** 2026-03-30
> **Fontes:** docs/product/gtm-mvp.md · docs/mvp/mvp-definition.md · docs/mvp/boundaries.md · docs/sales/icp-definition.md
> **Status:** Pacote de Sales & Pilot — Lote 1

---

## Definição do produto

**Em 1 frase:**
> CONDSTORE OS é o cockpit onde o operador recebe o pedido no WhatsApp, cota o frete com múltiplos carriers e abre o pedido — na mesma tela, sem trocar de ferramenta.

**Em 1 parágrafo:**
> O CONDSTORE OS centraliza três tarefas que hoje vivem em ferramentas separadas: receber e responder mensagens no WhatsApp com contexto do cliente, cotar frete com múltiplos carriers em tempo real, e criar e acompanhar o pedido até a entrega. O operador não precisa abrir planilha, ligar para transportadora ou copiar dados entre sistemas. Tudo acontece dentro do cockpit, com histórico do cliente visível, e o pedido rastreável desde o momento em que é criado.

---

## ICP — Para quem é

**Perfil principal:**
Distribuidora B2B atacadista que vende pelo WhatsApp e precisa cotar frete como parte do processo de venda.

| Dimensão | Critério |
|---|---|
| Operadores | 2–20 atendentes |
| Volume | 20–500 pedidos/mês |
| Frete | Cotação influencia a decisão de compra |
| Situação atual | WhatsApp + planilha + site de carrier = 3+ ferramentas separadas |
| Gestor | Sente falta de visibilidade sobre pedidos em aberto |

**Perfil secundário:**
Revenda especializada (materiais de construção, insumos, peças industriais, produtos de condomínio) com 1–5 operadores e alto volume de contato por WhatsApp.

**Sinais fortes de fit:**
- Operador abre 2+ ferramentas para fechar 1 pedido
- Gestor não sabe quantos pedidos estão abertos hoje
- Cotação de frete leva mais de 5 minutos
- Cliente liga perguntando onde está o produto
- Time perdeu venda porque cotação não voltou a tempo

**Descartar quando:**
- Empresa não vende pelo WhatsApp
- Já tem ERP com módulo de logística integrado no fluxo diário
- Quer automação total como condição inicial
- Exige integração com ERP, WMS, fiscal ou marketplace para testar
- Volume abaixo de 10 pedidos/mês sem dor operacional real

---

## Dor principal

> O operador recebe o pedido no WhatsApp, precisa cotar frete em outro sistema (site da transportadora ou planilha), copiar os dados para criar o pedido em outro lugar, e depois consultar o tracking em outro sistema. São 3–4 ferramentas para uma única venda.

**Por que dói:**
- Cotação manual leva 10–20 minutos por pedido
- Cliente espera resposta — demora = pedido perdido para o concorrente
- Operador não tem histórico do cliente na frente ao responder
- Pedidos se perdem entre WhatsApp, planilha e e-mail
- Gestor não tem visibilidade de quantos pedidos estão abertos nem qual o status

---

## Proposta de valor

**Principal:**
> Do WhatsApp ao pedido rastreado — sem sair do cockpit.

**Ganhos concretos:**
- Cotação de 15 minutos reduzida para menos de 30 segundos
- Menos pedido perdido por demora = mais receita direta
- Operador atende mais sem contratar mais gente
- Gestor vê tudo em tempo real sem precisar perguntar

**Versão para o operador:**
> "Você vai fazer o mesmo que já faz — 10x mais rápido, sem trocar de tela."

**Versão para o gestor/dono:**
> "CONDSTORE OS centraliza atendimento WhatsApp, cotação de frete multi-carrier e lifecycle de pedido em um cockpit único. O operador mantém o controle, a operação ganha velocidade e você tem visibilidade em tempo real de tudo que está em aberto."

---

## O que entra no MVP

- **Inbox WhatsApp:** recebe mensagens via Twilio, exibe com histórico do cliente
- **Cotação multi-carrier:** consulta Melhor Envio API + carriers de tabela (Movvi, Mengue, Braspress) em paralelo
- **Criação de pedido:** converte cotação aprovada em pedido com um clique
- **Fila de logística:** acompanhamento de status até a entrega
- **Pipeline CRM:** Kanban de negociação por stage
- **Gestão de clientes:** histórico consolidado de pedidos e interações
- **Multi-usuário:** controle de acesso por papel (operador, gerente, admin)

**O que entra no onboarding:**
- Configuração do número WhatsApp (Twilio Business API)
- Cadastro de carriers e tabelas de frete do cliente
- Criação de usuários e papéis
- Treinamento prático no fluxo: mensagem → cotação → pedido
- Acompanhamento das primeiras 48h de operação

---

## O que NÃO entra (comunicar explicitamente)

| Item | Explicação |
|---|---|
| Respostas automáticas | Operador humano sempre aprova antes de enviar |
| Integração com ERP | Ferramenta operacional standalone |
| IA autônoma / Frank runtime | Infraestrutura existe, desligada propositalmente no Lote 1 |
| Gestão de estoque | Domínio separado |
| Emissão de nota fiscal | Complexidade regulatória |
| Campanhas / disparo em massa | MVP é inbound puro |
| Marketplace | WhatsApp é o único canal no Lote 1 |

---

## Framing correto: assistente operacional supervisionado

O CONDSTORE OS não é chatbot, não é IA autônoma e não substitui o operador. É um cockpit que entrega a informação certa na hora certa para que o operador tome a decisão com velocidade e segurança.

**Como apresentar supervisão como vantagem:**
> "O sistema não responde pelo seu operador. Ele entrega a informação certa, na hora certa, para que o operador decida com segurança. Isso não é limitação — é controle. Você sabe o que saiu, quem aprovou, e por quê."

Três framings comerciais complementares:
- "Automação total soa bonito até o sistema responder errado para um cliente."
- "O seu operador continua sendo o rosto da empresa — com muito mais velocidade."
- "Você não perde o controle da operação, você ganha visibilidade sobre ela."

---

## Pitch comercial curto

**Para abertura de conversa:**
> "Quando seu operador recebe um pedido no WhatsApp, quantas abas ele precisa abrir para fechar essa venda? A gente resolve isso com uma tela só."

**Para o decisor financeiro:**
> "Você cota 50 pedidos/mês. Cada cotação leva 15 minutos. São 12,5 horas por mês só cotando frete. A mensalidade custa menos que 2 horas do seu operador."

**Para objeção de 'já temos processo':**
> "Funcionar não significa escalar. O cockpit não muda o processo — acelera ele. Você continua no controle, o operador fica mais rápido."

---

## Referências relacionadas

- Definição técnica completa: [`docs/mvp/mvp-definition.md`](../mvp/mvp-definition.md)
- Limites explícitos do MVP: [`docs/mvp/boundaries.md`](../mvp/boundaries.md)
- ICP detalhado: [`docs/sales/icp-definition.md`](../sales/icp-definition.md)
- Estratégia GTM completa: [`docs/product/gtm-mvp.md`](../product/gtm-mvp.md)
