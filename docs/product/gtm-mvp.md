# GTM — Estratégia Comercial do MVP CONDSTORE OS

> **Data de criação:** 2026-03-29
> **Baseado em:** mapeamento MVP consolidado (golive-scope.md + domain-map.md + estado real do repositório)
> **Restrição principal:** reflete o Lote 1 tal como existe. Nada frozen, nada inventado.

---

## 1. Definição comercial do produto

**Nome principal:** CONDSTORE OS

**Nome alternativo:** Condstore — Cockpit de Atendimento e Logística

**Categoria:** CRM operacional com gestão de frete para distribuidoras B2B

**Definição em 1 frase:**
> CONDSTORE OS é o cockpit onde o operador recebe o pedido no WhatsApp, cota o frete com múltiplos carriers e abre o pedido — na mesma tela, sem trocar de ferramenta.

**Definição em 1 parágrafo:**
> O CONDSTORE OS centraliza três tarefas que hoje vivem em ferramentas separadas: receber e responder mensagens no WhatsApp com contexto do cliente, cotar frete com múltiplos carriers em tempo real, e criar e acompanhar o pedido até a entrega. O operador não precisa abrir planilha, ligar para a transportadora ou copiar dados entre sistemas. Tudo acontece dentro do cockpit, com histórico de cliente visível, e o pedido rastreável desde o momento em que é criado.

**O que ele faz:**
- Recebe mensagens do WhatsApp e exibe no inbox com histórico do cliente
- Cota frete com múltiplos carriers (Movvi, Mengue, Braspress, Melhor Envio) dentro da conversa
- Converte cotação aprovada em pedido com um clique
- Acompanha o pedido até a entrega na fila de logística
- Gerencia pipeline de negociação em Kanban (CRM)
- Registra clientes com histórico de pedidos e interações

**O que ele NÃO faz (MVP atual):**
- Não responde automaticamente no WhatsApp — operador humano sempre no centro
- Não integra com ERP ou sistema de estoque
- Não gera conteúdo por IA de forma autônoma
- Não faz disparo de mensagens em massa
- Não gerencia catálogo de produtos de forma completa
- Não emite nota fiscal
- Não opera sem operador humano ativo

**Para quem ele é:**
- Distribuidoras B2B e atacadistas que recebem pedidos pelo WhatsApp
- Revendas que dependem de cotação de frete como parte do processo de venda
- Operações com 1–20 atendentes que hoje usam ferramentas separadas (WhatsApp + planilha + Melhor Envio)
- Gestores que precisam de visibilidade sobre o que está sendo pedido e o status de cada entrega

**Para quem ele NÃO é:**
- E-commerce D2C de alto volume com ERP já integrado
- Empresas que não vendem pelo WhatsApp
- Operações que precisam de automação total sem intervenção humana
- Empresas que precisam de integração com marketplace (Mercado Livre, Shopee etc.)

---

## 2. Problema e proposta de valor

**O problema:**
> Um operador de distribuidora recebe um pedido pelo WhatsApp, precisa cotar frete em outro sistema (site da transportadora ou planilha), copiar os dados para criar o pedido em outro lugar, e depois consultar o tracking em outro sistema ainda. São 3–4 ferramentas para uma única venda.

**Por que dói:**
- Cada cotação manual leva de 10 a 20 minutos (ligação para transportadora ou site por site)
- O cliente espera resposta. Demora = pedido perdido para o concorrente
- O operador não tem o histórico do cliente na frente quando responde
- Pedidos se perdem entre WhatsApp, planilha e e-mail
- O gestor não tem visibilidade de quantos pedidos estão em aberto nem qual o status de cada um

**Por que vale pagar para resolver:**
- Cotação que levava 15 minutos passa para menos de 30 segundos
- O operador atende mais pedidos por hora sem contratar mais gente
- Menos pedido perdido por demora = mais receita direta
- Visibilidade de cada pedido = menos ligação de cliente perguntando onde está o produto

**Ganho imediato:**
- Cotação de frete na mesma tela da conversa do WhatsApp
- Pedido criado sem sair do cockpit
- Histórico do cliente visível ao responder

**Ganho acumulado:**
- Operação mais veloz sem aumentar headcount
- Pipeline de negociação com métricas reais
- Histórico consolidado de interações e pedidos por cliente

**Proposta de valor principal:**
> Do WhatsApp ao pedido rastreado — sem sair do cockpit.

**Três versões da proposta de valor:**

*Ultra simples:*
> "Cota o frete, cria o pedido e acompanha a entrega — tudo dentro do WhatsApp do seu operador."

*Comercial:*
> "Seu operador recebe o pedido no WhatsApp, cota com os melhores carriers em segundos, abre o pedido e acompanha a entrega — na mesma tela. Sem planilha, sem copiar dados, sem trocar de sistema."

*Para gestores e donos de operação:*
> "CONDSTORE OS centraliza o atendimento WhatsApp, a cotação de frete multi-carrier e o lifecycle de pedido em um cockpit único. O operador mantém o controle, a operação ganha velocidade e o gestor tem visibilidade em tempo real de tudo que está em aberto."

---

## 3. ICP e recorte comercial inicial

**ICP principal:**
Distribuidora B2B atacadista que vende pelo WhatsApp e precisa cotar frete como parte do processo de venda.

| Dimensão | Perfil |
|---|---|
| Operadores | 2–20 atendentes |
| Volume | 20–500 pedidos/mês |
| Frete | Custo visível, negociável com o cliente |
| Carriers | Usa 2+ carriers, sem contrato exclusivo |
| Hoje | WhatsApp + planilha + site de carrier = 3 ferramentas separadas |

**ICP secundário:**
Revenda especializada (materiais de construção, insumos, peças industriais, produtos de condomínio) com 1–5 operadores, alto volume de contato por WhatsApp, onde o atendente é quem fecha a venda.

**Quem parece parecido mas não é foco:**
- E-commerce D2C com fulfillment próprio — não tem o problema de cotação manual
- Empresa de serviços sem produto físico
- Grande atacadista já integrado com ERP e TMS — problema "resolvido" de outra forma
- Empresa que quer automação total antes de ter o processo manual funcionando

**Sinais de fit:**
- Operador responde pedido no WhatsApp e abre o site da transportadora para cotar
- Gestor não sabe quantos pedidos estão abertos hoje
- Cliente liga perguntando onde está o produto
- Atendente abre 3+ abas para fechar um pedido
- Empresa tem 2+ transportadoras mas nenhuma integração

**Sinais de no-fit:**
- Já tem ERP com módulo de logística integrado
- Não vende pelo WhatsApp
- Quer que o sistema responda automaticamente desde o primeiro dia
- Volume abaixo de 10 pedidos/mês (ROI baixo para o custo de onboarding)
- Operação centralizada em único carrier com contrato fechado

---

## 4. Oferta inicial

**O que está sendo vendido:**
Acesso ao CONDSTORE OS — cockpit operacional com inbox WhatsApp, cotação de frete multi-carrier, gestão de pedidos e fila de logística — para equipes de atendimento e operação.

**Escopo da entrega:**
- Cockpit web (inbox, cotação, pedidos, logística, clientes, configurações)
- Integração WhatsApp via Twilio (número da empresa conectado)
- Carriers ativos: Melhor Envio API + carriers de tabela (Movvi, Mengue, Braspress configuráveis)
- Multi-usuário com controle de acesso por papel (operador, gerente, admin)
- Histórico de clientes e pedidos

**O que entra no onboarding:**
- Configuração do número WhatsApp (Twilio Business API)
- Cadastro de carriers e tabelas de frete do cliente
- Criação de usuários e papéis
- Treinamento prático no fluxo: mensagem → cotação → pedido
- Acompanhamento das primeiras 48h de operação

**O que entra na operação contínua:**
- Cockpit disponível para os operadores
- Notificações de status de pedidos
- Suporte via canal dedicado

**O que fica fora (comunicar explicitamente na proposta):**
- Respostas automáticas por IA
- Integração com ERP, WMS ou marketplace
- Emissão de nota fiscal
- Gestão de estoque
- Disparo de campanhas de WhatsApp

**Como vender sem prometer automação total:**
Posicionar como "cockpit assistido" — o sistema entrega velocidade e visibilidade, mas o operador decide. A venda é: "você vai fazer o mesmo que já faz, 10x mais rápido e sem trocar de tela."

**Como apresentar supervisão humana como vantagem:**
> "O sistema não responde pelo seu operador. Ele entrega a informação certa, na hora certa, para que o operador tome a decisão com segurança. Isso não é uma limitação — é controle. Você sabe o que saiu, quem aprovou, e por quê."

Três framing comerciais:
- "Automação total soa bonito até o sistema responder errado para um cliente."
- "O seu operador continua sendo o rosto da empresa — com muito mais velocidade."
- "Você não perde o controle da operação, você ganha visibilidade sobre ela."

---

## 5. Embalagem comercial

**Tagline principal:**
> "Do WhatsApp ao pedido. Sem sair do cockpit."

**5 alternativas de tagline:**
1. "Cota, cria o pedido e rastreia. Tudo na mesma tela."
2. "O cockpit da sua operação de vendas e frete."
3. "Seu operador mais rápido. Sua operação mais visível."
4. "Atendimento, cotação e pedido. Um lugar só."
5. "Para de trocar de aba. Começa a fechar pedido."

**Headline de landing:**
> "Do pedido no WhatsApp à entrega rastreada — sem sair do cockpit."

**Subheadline:**
> "Seu operador recebe a mensagem, cota o frete com os melhores carriers em segundos, cria o pedido e acompanha a entrega — tudo na mesma tela. Sem planilha, sem copiar dados, sem perder pedido."

**3 bullets de benefício:**
- Cotação de frete multi-carrier em menos de 30 segundos, dentro da conversa do WhatsApp
- Pedido criado diretamente da cotação aprovada, com histórico do cliente já preenchido
- Fila de logística em tempo real — o gestor vê tudo que está aberto, sem precisar perguntar

**3 bullets de diferenciais reais:**
- Inbox WhatsApp com contexto de cliente: o operador vê pedidos anteriores, empresa e histórico antes de responder
- Cotação com carriers de tabela própria + Melhor Envio, sem depender de um único carrier
- Operação supervisionada por design: o sistema acelera, o operador decide

**3 bullets do que o sistema evita:**
- Evita perder pedido por demorar 15 minutos para cotar o frete
- Evita copiar dados entre WhatsApp, planilha e site de transportadora
- Evita que o gestor fique no escuro sobre quantos pedidos estão em aberto

**Descrição curta (perfil/site/listagem):**
> CONDSTORE OS é um cockpit operacional para distribuidoras B2B que vendem pelo WhatsApp. Centraliza inbox de atendimento, cotação de frete multi-carrier e gestão de pedidos em uma única interface — para que o operador feche mais rápido sem trocar de ferramenta.

**Descrição média (deck/comercial):**
> CONDSTORE OS resolve um problema concreto de distribuidoras B2B: o operador recebe o pedido pelo WhatsApp, precisa cotar o frete em outro sistema, abrir o pedido em outro, e acompanhar a entrega em outro ainda. São 3 a 4 ferramentas para uma única venda.
>
> O CONDSTORE OS centraliza tudo em um cockpit web. O operador vê a mensagem do WhatsApp com o histórico completo do cliente ao lado. Solicita a cotação — o sistema consulta Melhor Envio e carriers de tabela em paralelo e retorna as melhores opções em segundos. Com a cotação aprovada, converte em pedido com um clique. O pedido entra automaticamente na fila de logística, com status atualizado até a entrega.
>
> O operador humano permanece no centro de cada decisão. O sistema entrega velocidade e visibilidade — não substitui o julgamento de quem conhece o cliente.

---

## 6. Estrutura de pricing inicial

**Modelo recomendado:** híbrido — setup fee + mensalidade por operador (ou por faixa de cotações/mês)

**Por que esse modelo:**
- Setup fee cobre o custo real de onboarding (configuração Twilio, carriers, treinamento)
- Mensalidade por operador alinha custo com uso — 3 operadores pagam menos que 15
- Evita cobrança por transação, que gera fricção toda vez que o cliente usa o sistema
- Para o estágio atual (poucos clientes, onboarding manual), o híbrido simplifica a conversa comercial

**O que justifica o setup fee:**
- Configuração da integração WhatsApp (Twilio Business API não é self-service)
- Cadastro de carriers e tabelas de frete do cliente
- Treinamento do time operacional
- Acompanhamento das primeiras 48h

**O que justifica a mensalidade:**
- Acesso contínuo ao cockpit
- Processamento de mensagens e eventos
- Suporte operacional
- Manutenção e atualização do sistema

**Faixas plausíveis** *(estrutura de raciocínio — validar com os primeiros 3–5 clientes antes de fixar):*

| Tier | Operadores | Cotações/mês | Setup | Mensalidade |
|---|---|---|---|---|
| **Starter** | até 2 | até 200 | R$ 0 | R$ 0 (piloto limitado) |
| **Essencial** | até 5 | até 1.000 | R$ 500–800 | R$ 400–600 |
| **Pro** | até 15 | até 5.000 | R$ 1.000–1.500 | R$ 900–1.400 |
| **Enterprise** | ilimitado | ilimitado | sob consulta | sob consulta |

> Os valores acima são baseados em posicionamento de mercado (não em custo técnico), alinhados com o que uma distribuidora B2B pagaria por CRM simples + integração de frete. Não fixar antes de validar com clientes reais.

**Como cobrar sem parecer software genérico:**
- Nomear o problema específico que resolve — "cotação de frete no WhatsApp" não é genérico
- Usar cálculo de ROI na proposta: "você cota 50 pedidos/mês. Cada cotação leva 15 min. São 12,5 horas. A mensalidade custa menos que 2 horas do seu operador."
- Apresentar como "cockpit operacional" — não como "CRM" nem como "plataforma"

**Estrutura da proposta comercial:**
1. **Diagnóstico:** pedidos/mês, operadores, tempo atual de cotação
2. **ROI calculado:** tempo economizado × custo da hora do operador
3. **Escopo fechado:** o que está incluído, o que está fora, como é o onboarding
4. **Proposta:** setup + mensalidade com prazo de contrato (6 ou 12 meses para desconto)
5. **Próximo passo:** piloto remunerado de 30 dias com onboarding completo

---

## 7. Demo e prova

**Melhor forma de demonstrar:**
Demo ao vivo com ambiente configurado e dado realista. Duração máxima: 20 minutos. O decisor precisa ver o fluxo completo do início ao fim.

**Fluxo que deve aparecer na demo:**
```
1. Mensagem chega no WhatsApp (simular ao vivo)
2. Operador vê no inbox — com histórico do cliente ao lado
3. Operador solicita cotação dentro da conversa
4. Sistema retorna 2–3 opções de carrier em segundos
5. Operador seleciona a melhor opção
6. Converte em pedido com um clique
7. Pedido aparece na fila de logística com status
8. Gestor vê o painel com todos os pedidos abertos
```

**Caso de uso que deve abrir a apresentação:**
> "Hoje, quando seu operador recebe um pedido no WhatsApp, quantas abas ele precisa abrir para fechar essa venda?"

Deixar o cliente responder. Então mostrar que no CONDSTORE OS é uma única tela.

**O que NÃO mostrar na demo:**
- Frank / IA / automações — qualquer menção cria expectativa que o MVP não entrega
- DOMINE como conceito — é invisível para o operador, não é argumento comercial
- RAG / knowledge base
- Painéis de analytics ainda não operacionais
- Configurações técnicas (webhooks, tokens, crons)

**Métricas e provas para convencer:**
- Tempo de cotação: antes 10–15 min manual → depois <30 segundos
- Número de ferramentas: antes 3–4 → depois 1
- Pedidos sem follow-up: antes "não sei" → depois visíveis em tempo real
- Dados reais de operação do LojaCond (quando disponíveis): X pedidos/semana, Y cotações/dia

**Como provar valor antes de ter escala:**
- Piloto remunerado com cliente real: 30 dias de operação com acompanhamento
- Documentar o antes/depois com o próprio cliente (tempo de cotação, pedidos perdidos, horas economizadas)
- Usar esse depoimento como prova social para o segundo cliente

**Narrativa para pilotos:**
> "A gente não pede que você confie às cegas. Propomos 30 dias de operação real, com suporte próximo. Você roda o piloto com parte do time, a gente acompanha junto. No final do mês, ou o resultado justifica a continuidade — ou não. Simples assim."

---

## 8. Canais de venda iniciais

**Como vender os primeiros clientes:**
Venda direta, founder-led. Sem outbound automatizado, sem anúncio. Conversas pessoais com donos e gestores de distribuidoras.

**Melhor canal inicial:**
LinkedIn direto para gerentes de operação e donos de distribuidoras B2B no Brasil. Complemento: grupos de WhatsApp de associações do setor (materiais de construção, alimentos, insumos industriais).

**Abordagem ideal:**
- Não vender produto. Perguntar sobre o problema.
- "Como sua equipe cota frete hoje? Quanto tempo leva cada cotação?"
- Se o problema existir → marcar demo. Se não existir → próximo.

**Mensagem de abertura (LinkedIn ou WhatsApp):**
> "Oi [nome], trabalho com operações de distribuidoras B2B. Percebi que muitos gestores do seu segmento ainda cotam frete manualmente pelo WhatsApp — leva uns 15 minutos por pedido. Se isso acontece com você, tenho algo que pode reduzir isso para menos de 30 segundos. Vale 15 minutos de conversa?"

**Objeções previsíveis e respostas:**

| Objeção | Resposta |
|---|---|
| "Já temos um sistema" | "O sistema integra a cotação de frete dentro do WhatsApp? Ou é outro processo separado?" |
| "É muito caro" | "Quanto tempo seu operador gasta cotando frete por dia? A mensalidade provavelmente custa menos que isso." |
| "Precisa de automação, não de cockpit" | "Faz sentido automatizar quando o processo manual já está claro. O cockpit é o primeiro passo — você ganha velocidade sem perder controle." |
| "Não temos tempo para implementar" | "O onboarding inteiro leva menos de uma semana. Fazemos junto, você não precisa de TI interno." |
| "Precisamos integrar com nosso ERP" | "O MVP não tem integração com ERP hoje. Se isso é bloqueante, precisamos entender o fluxo antes de avançar." |

**O que NÃO dizer:**
- "Temos IA que responde seus clientes automaticamente" — não é verdade no MVP
- "Nossa plataforma faz tudo" — não faz
- "Você vai eliminar seus operadores" — é o oposto do que o produto faz
- "É como um CRM turbinado com IA" — vago e inflado
- Qualquer percentual de melhoria sem dados reais do cliente

---

## 9. Apresentação pública / Product Hunt

**Recorte correto para exposição pública:**
"CRM operacional para distribuidoras B2B que vendem pelo WhatsApp" — não "plataforma de IA", não "automação de vendas", não "sistema operacional completo".

**Como apresentar em ambiente tipo Product Hunt:**
- Categoria: Sales / CRM / Logistics
- Posição: tool for B2B operations teams

**O que simplificar na narrativa:**
- Não mencionar DOMINE, Frank, RAG, Supreme
- Não mencionar arquitetura multi-tenant ou event-driven
- Não usar nenhum termo técnico
- Simplificar para o fluxo: WhatsApp → cotação → pedido

**O que nunca deve aparecer como promessa pública agora:**
- Respostas automáticas por IA
- Sugestões automáticas de resposta
- Integração com ERP ou marketplace
- Playbooks de automação
- Qualquer feature do Frank runtime

**Tagline mais clicável sem trair a verdade:**

*Internacional:*
> "WhatsApp inbox + freight quoting + order tracking — for B2B distributors."

*Mercado nacional:*
> "Inbox do WhatsApp, cotação de frete e pedidos — tudo na mesma tela para distribuidoras B2B."

---

## 10. Síntese final

**Definição final do produto:**
CONDSTORE OS é um cockpit operacional para distribuidoras B2B que recebem pedidos pelo WhatsApp. Centraliza inbox de atendimento, cotação de frete multi-carrier e gestão de pedidos em uma única interface supervisionada por operadores humanos.

**Melhor tese comercial:**
> Distribuidoras B2B vendem pelo WhatsApp mas operam em 3–4 ferramentas separadas para fechar um único pedido. O CONDSTORE OS resolve isso centralizando o fluxo completo em um cockpit — sem prometer automação que não existe, sem criar dependência de IA instável.

**Melhor recorte de venda:**
Tempo perdido por cotação manual × volume de pedidos por mês = argumento financeiro direto. O produto se vende pela redução de atrito operacional, não por promessa de inovação.

**Melhor forma de apresentar o MVP:**
Demo ao vivo, 20 minutos, fluxo completo da mensagem ao pedido. Sem slides sobre arquitetura, sem menção a IA, sem prometer o que ainda não existe.

**O erro mais perigoso de posicionamento:**
Chamar de "plataforma com IA" ou mencionar Frank como argumento de venda. Isso cria expectativa de automação que o MVP não entrega — e garante churn no primeiro mês quando o cliente percebe que o operador ainda precisa aprovar tudo.

**O que vender nos próximos 30 dias:**
- 3 a 5 pilotos remunerados com distribuidoras B2B que já usam WhatsApp como canal principal de venda
- Onboarding com acompanhamento das primeiras 48h de operação
- Objetivo: gerar 2–3 depoimentos reais com dados mensuráveis (tempo economizado, pedidos criados) para usar como prova social nos próximos clientes
