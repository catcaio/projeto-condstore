# CONDSTORE OS — Roteiro de Demo Comercial

> **Consolidado em:** 2026-03-30
> **Fonte principal:** docs/demo/demo-script.md · docs/sales/call-structure.md · docs/product/gtm-mvp.md
> **Duração:** 10–15 minutos (demo focada) ou até 20 minutos com discovery

---

## Antes de começar

**Setup necessário:**
- Cockpit aberto no browser, logado, na aba de Conversas (inbox)
- Celular em mãos para enviar mensagem WhatsApp ao vivo
- Dados demo carregados: cliente "Carlos Andrade / Construdis", histórico de 3 compras
- Resolução adequada para o prospect enxergar na tela

**Princípio da demo:**
Não apresentar features. Apresentar o **problema resolvido**. Deixar o cliente falar nas pausas.

---

## Abertura — Discovery rápido (2–3 min)

**Não abrir o sistema ainda.**

> "Antes de te mostrar qualquer coisa, me conta: quando um cliente manda mensagem pedindo cotação de frete no WhatsApp, como funciona o processo hoje no seu time?"

*(Ouvir. Não interromper.)*

Se descrever processo manual:
> "Quanto tempo isso leva em média?"

*(Anotar o número. Vai ser usado no fechamento.)*

Se disser que já tem algo automatizado:
> "E o operador consegue ver o histórico de pedidos do cliente na mesma tela que ele está respondendo no WhatsApp?"

*(Raramente a resposta é sim.)*

**Transição:**
> "Vou te mostrar o que acontece quando um cliente manda essa mesma mensagem aqui. Deixa eu enviar agora."

*(Enviar mensagem WhatsApp para o número da demo.)*

---

## Parte 1 — Mensagem chegando no inbox (2 min)

*(Mostrar a mensagem aparecendo na lista)*

> "Veja. A mensagem chegou aqui. Carlos Andrade, da Construdis — cliente que já comprou 3 vezes. Stage atual: Quoted."

*(Clicar na conversa)*

> "Tela dividida. Conversa à esquerda. Cliente à direita. Antes de digitar qualquer resposta, o operador já sabe quem é Carlos, qual foi o último pedido e quantas compras ele tem no histórico."

**Pausa:**
> "Hoje, quando o seu operador recebe mensagem, ele sabe isso antes de responder — ou precisa abrir outro sistema para descobrir?"

---

## Parte 2 — Cotação de frete (2–3 min)

*(Com a conversa de Carlos aberta)*

> "O operador vai cotar agora. Clica em 'Pedir cotação'."

> "CEP já puxou do endereço do cliente — Limeira. Peso calculado: 600kg. Clica em 'Consultar carriers'."

*(Aguardar 2–5 segundos)*

> "Pronto. Movvi: R$ 148, 3 dias. Braspress: R$ 185, 2 dias. Melhor Envio: R$ 132, 4 dias. O sistema consultou os 3 ao mesmo tempo."

**Pausa:**
> "Você me disse que levava [X] minutos. Aqui foram menos de 5 segundos. O operador agora escolhe a melhor opção ou manda as opções para o Carlos decidir."

---

## Parte 3 — Criação do pedido (1 min)

*(Selecionar Movvi e criar o pedido)*

> "Vamos com a Movvi. Clica, confirma."

> "Pedido criado. Stage do Carlos atualizado para Won no CRM. Tudo isso sem sair da tela."

*(Mostrar brevemente o Kanban — Carlos em 'Won')*

> "Aconteceu automaticamente quando o pedido foi criado."

---

## Parte 4 — Visão do gestor (2 min)

*(Navegar para fila de logística)*

> "Esse pedido já está aqui. Carrier: Movvi. Destino: Limeira. Prazo: 3 dias úteis. Status: CREATED."

*(Navegar para painel geral de pedidos)*

> "Essa é a tela do gestor. Pedidos de hoje, em aberto, entregues essa semana. Sem perguntar pro operador, sem abrir planilha."

**Pausa:**
> "Você tem essa visibilidade hoje de forma instantânea — ou precisa consolidar de vários lugares?"

---

## Fechamento — Proposta de piloto (2–3 min)

> "É isso. O que você viu foi: mensagem chega no WhatsApp, operador atende com contexto do cliente, cota em segundos, cria o pedido, e o gestor vê tudo em tempo real. Tudo na mesma tela."

*(Usar o número que o cliente disse na abertura)*

> "Você me falou que leva [X] minutos por cotação. Com [Y] pedidos por mês, são [Z] horas por mês só cotando frete. Aqui seriam menos de 5 minutos. O que você faria com esse tempo?"

**Proposta direta:**
> "A nossa proposta é simples: piloto de 30 dias. A gente configura tudo — WhatsApp, carriers, usuários. Você opera de verdade com o seu time. No final do mês, você tem dados reais para decidir se continua ou não."

**Pergunta de fechamento:**
> "Quantos pedidos vocês processam por mês hoje?"

**Convite para próximo passo:**
> "Posso marcar uma sessão de onboarding na próxima semana? Em menos de 2 horas configuramos tudo e você já começa a operar."

---

## Perguntas frequentes durante a demo

| Pergunta | Resposta |
|---|---|
| "Isso responde automaticamente?" | "Não. O operador é quem responde — o sistema entrega as informações para ele decidir. Isso é controle, não limitação." |
| "Integra com nosso ERP?" | "Não integra hoje. O CONDSTORE OS é ferramenta operacional standalone. Se isso for bloqueante, preciso entender melhor o fluxo de vocês." |
| "E se o WhatsApp cair?" | "Se a API do Twilio tiver problema, o operador não recebe mensagens novas. Pedidos e histórico já registrados continuam acessíveis." |
| "Dá para importar nossos clientes?" | "Não tem importação automática hoje. Clientes entram conforme mandam mensagem. Dados existentes são cadastrados manualmente se necessário." |
| "Qual o preço?" | "Depende do número de operadores e volume. Prefiro montar baseado no seu volume real — envio proposta depois dessa conversa." |

---

## O que nunca dizer na demo

- "Nossa plataforma tem IA que..."
- "Em breve vamos ter..."
- "É como o [concorrente] mas melhor"
- "Você vai eliminar operadores"
- Qualquer percentual de melhoria sem dados reais do cliente
- "Isso é fácil de integrar" (se não souber de fato)

---

## Se o cliente não for fit

Sinais durante a demo:
- "Já temos ERP com tudo isso integrado"
- "Não usamos WhatsApp para vender"
- "Precisamos de automação total — humano não dá conta"

Resposta honesta:
> "Entendo. O que mostramos é para operação com operador humano no centro. Se o objetivo é automação total, ainda não é o nosso momento. Se isso mudar, fico à disposição."

Não forçar venda. Registrar como no-fit em [`docs/pilots/pilot-status.md`](../pilots/pilot-status.md).

---

## Referências relacionadas

- Roteiro detalhado de call: [`docs/sales/call-structure.md`](../sales/call-structure.md)
- Dataset de demo: [`docs/demo/demo-dataset.md`](../demo/demo-dataset.md)
- Checklist pré-demo: [`docs/demo/demo-checklist.md`](../demo/demo-checklist.md)
- Proposta de piloto: [`docs/gtm/pilot-proposal.md`](./pilot-proposal.md)
