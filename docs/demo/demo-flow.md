# Demo — Fluxo oficial da demonstração

**Duração total:** 20 minutos
**Ambiente:** Cockpit CONDSTORE OS com dados do demo-dataset.md carregados

---

## Visão geral do fluxo

```
[1] Mensagem no WhatsApp
      ↓ (30 seg)
[2] Inbox com histórico do cliente
      ↓ (2 min)
[3] Solicitação de cotação de frete
      ↓ (1 min)
[4] Resultado: 3 opções de carrier
      ↓ (2 min)
[5] Escolha do carrier + criação do pedido
      ↓ (1 min)
[6] Pedido visível na fila de logística
      ↓ (2 min)
[7] Visão do gestor (painel completo)
      ↓ (3 min)
[Fechamento] Convite para piloto
      ↓ (5 min)
```

---

## Etapa 1 — Mensagem chegando no WhatsApp

**Duração:** 30 segundos

**Setup (antes da demo):**
- Enviar do celular pessoal para o número Twilio: *"Boa tarde! Preciso de 12 sacos de cimento CP-II para entregar em Limeira, no CEP 13480-000. Qual o frete?"*
- A mensagem deve aparecer no inbox enquanto o cliente está olhando

**Ação do operador:**
- Mostrar o cockpit aberto no inbox
- A mensagem aparece no topo da lista com "1 nova mensagem"

**Resposta do sistema:**
- Badge de notificação aparece na conversa
- Nome do cliente (Carlos Andrade — Construdis) aparece com tag do stage atual

**O que falar:**
> "Esse é o momento em que o WhatsApp do seu operador toca. Em vez de o WhatsApp estar no celular — onde a mensagem some no meio de outras 50 — ela aparece aqui, no cockpit, com o contexto do cliente do lado."

---

## Etapa 2 — Inbox com histórico do cliente

**Duração:** 2 minutos

**Ação do operador:**
- Clicar na conversa de Carlos Andrade
- A tela divide: conversa à esquerda, painel do cliente à direita

**Resposta do sistema:**
- Mensagem do WhatsApp visível
- Painel direito mostra:
  - Nome: Carlos Andrade
  - Empresa: Construdis Materiais LTDA
  - Último pedido: 10/03/2026 — Rejunte Cinza — DELIVERED
  - Total de pedidos: 3
  - Stage atual: Quoted

**O que falar:**
> "O operador já sabe com quem está falando antes de digitar a primeira resposta. Veja aqui — Carlos já comprou 3 vezes. O último pedido foi entregue. Isso muda completamente como você atende. Não é estranho, é um cliente fiel pedindo de novo."

**Pausar aqui e perguntar ao cliente:**
> "Hoje, quando um cliente manda mensagem, seu operador sabe quais foram os pedidos anteriores dele?"

*(Aguardar resposta — geralmente é "não" ou "só se for olhar em outro sistema")*

---

## Etapa 3 — Solicitação de cotação

**Duração:** 1 minuto

**Ação do operador:**
- Clicar no botão "Pedir cotação" dentro da conversa
- Um formulário abre: CEP de destino já preenchido (13480-000 do histórico do cliente)
- Confirmar os itens: 12x Cimento CP-II 50kg

**Resposta do sistema:**
- Campos pré-preenchidos com dados do cliente
- Peso total calculado automaticamente: 600kg
- Botão "Consultar carriers"

**O que falar:**
> "O operador clica em 'Pedir cotação'. CEP já vem preenchido. Peso calculado. Clica em consultar."

*(Clicar no botão — aguardar o sistema)*

---

## Etapa 4 — Resultado da cotação

**Duração:** 2 minutos

**Ação do operador:**
- Aguardar resultado (2-4 segundos)
- Mostrar as 3 opções na tela

**Resposta do sistema:**
- 3 cards aparecem:
  - Movvi — R$ 148,00 — 3 dias úteis
  - Braspress — R$ 185,00 — 2 dias úteis
  - Melhor Envio — R$ 132,00 — 4 dias úteis

**O que falar:**
> "Isso aconteceu em menos de 5 segundos. O sistema consultou 3 carriers ao mesmo tempo e trouxe as melhores opções. Antes disso levava quantos minutos?"

*(Aguardar resposta do cliente)*

> "O operador agora mostra essas opções pro Carlos no WhatsApp ou escolhe a melhor para o cliente. Vamos criar o pedido com a Movvi — bom equilíbrio de preço e prazo."

---

## Etapa 5 — Escolha do carrier + criação do pedido

**Duração:** 1 minuto

**Ação do operador:**
- Clicar no card da Movvi
- Card fica destacado (selecionado)
- Clicar em "Criar pedido"

**Resposta do sistema:**
- Modal de confirmação: cliente, produto, carrier, valor
- Clicar "Confirmar"
- Toast: "Pedido criado com sucesso — #2024031501"
- Stage do cliente muda automaticamente para "Won"

**O que falar:**
> "Um clique. O pedido está criado, o cliente está marcado como ganho no CRM, e o sistema sabe que saiu um pedido de 600kg com a Movvi para Limeira."

*(Mostrar brevemente o Kanban CRM com o card movido para 'Won')*

---

## Etapa 6 — Pedido visível na fila de logística

**Duração:** 2 minutos

**Ação do operador:**
- Navegar para aba "Logística" no menu lateral
- Mostrar a fila de shipments

**Resposta do sistema:**
- Pedido #2024031501 aparece no topo da fila
  - Cliente: Carlos Andrade — Construdis
  - Carrier: Movvi
  - Destino: Limeira — SP
  - Status: CREATED
  - SLA: 3 dias úteis — prazo: DD/MM/AAAA

**O que falar:**
> "Veja. Sem copiar para outro sistema, sem colar planilha. O pedido está aqui na fila de logística, com prazo, carrier e destino. Seu time de logística trabalha nessa tela. Quando der baixa, o status atualiza."

**Mostrar um pedido já entregue (histórico):**
> "Olha esse aqui — de fevereiro. Status: Delivered. O cliente recebeu. O sistema sabe. Ninguém precisou atualizar manualmente."

---

## Etapa 7 — Visão do gestor

**Duração:** 3 minutos

**Ação do operador:**
- Navegar para o painel de pedidos (visão de gestor)
- Mostrar filtros e contadores

**Resposta do sistema:**
- Painel com:
  - Total de pedidos hoje: X
  - Em aberto: Y
  - Entregues esta semana: Z
  - Kanban de pipeline com contagem por stage

**O que falar:**
> "Essa é a tela que o gestor olha. Não precisa perguntar para o operador 'quantos pedidos temos em aberto hoje'. Está aqui. Não precisa ligar para o carrier para saber se entregou. Está aqui."

*(Clicar em algum pedido e mostrar a timeline)*

> "Cada pedido tem uma linha do tempo. Quando foi criado, quando saiu para logística, quando foi entregue. Auditório completo."

**Perguntar ao cliente:**
> "Hoje você tem essa visibilidade de forma instantânea, ou precisa consolidar de vários lugares?"

---

## Fechamento — Convite para piloto

**Duração:** 5 minutos

**O que falar:**
> "Esse é o CONDSTORE OS. Do WhatsApp ao pedido rastreado — na mesma tela, sem trocar de ferramenta."

> "O operador fez tudo que faz hoje — só que em 3 minutos em vez de 20. E o gestor tem visibilidade em tempo real."

**Pergunta de encerramento:**
> "Faz sentido para a sua operação? Quantos pedidos vocês processam por mês?"

*(Ouvir resposta — calcular ROI ao vivo se possível)*

> "Nossa proposta é rodar um piloto de 30 dias com o seu time. A gente configura tudo — WhatsApp, carriers, usuários. Você opera de verdade. No final do mês, ou o resultado está claro ou não. Simples assim."

**Próximo passo:**
> "Posso marcar uma sessão de onboarding na próxima semana? Leva menos de 2 horas pra configurar tudo e já começar a operar."

---

## Notas para o apresentador

- **Não pausar muito** entre etapas — o ritmo da demo precisa ser fluido
- **Não mostrar configurações**, webhooks, tokens ou qualquer tela técnica
- **Se algo der errado** (timeout de carrier, etc.) — "Isso acontece às vezes com a API externa. A tabela própria de carriers sempre funciona." Mostrar as opções de tabela.
- **Adaptar os valores de frete** se forem diferentes dos do dataset — o importante é o conceito, não o número exato
- **Deixar o cliente falar** nas pausas marcadas — cada resposta é material para o fechamento
