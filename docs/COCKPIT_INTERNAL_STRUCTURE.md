# CONDSTORE OS — Estrutura interna do Cockpit

Documento da reestruturação interna. A Home pública não foi redesenhada: o posicionamento, a narrativa e o fio operacional permanecem.

## Arquitetura atual (antes)

O Cockpit do repositório (auditoria `docs/cockpit-route-audit.md`, 38 rotas) se organiza como **módulos independentes**:

```
Launcher / Overview
  ├── Dashboard de métricas
  ├── CRM / clientes
  ├── Inbox / conversas
  ├── Cotação / acquisition
  ├── Pedidos
  ├── Logística (simulador, envios, insights, auditoria, packing…)
  ├── FinOps, Domine, Playbooks, Knowledge
  └── Sistema (status, audit, security, equipe)
```

Problemas encontrados na auditoria e no uso:

- excesso de menus e salas de operação (tiles do launcher);
- módulos isolados — o operador troca de “software” para completar um fio;
- navegação redundante (`/cockpit/shipments` vs `/logistica/envios`, vários audits);
- contexto duplicado (cliente reaberto em cada tela);
- informação espalhada (KPI strip que não vira ação);
- fluxos quebrados conversa → cotação → pedido → logística;
- dashboards que mostram número e escondem a fila;
- pouca distinção operador vs gestor;
- integrações e APIs visíveis demais (fallback diagnostics no caminho crítico);
- mobile copiando o menu desktop.

Fonte: `docs/cockpit-route-audit.md`. A PR #357 (workspace foundation) ainda filtra a fila por módulo (conversas / frete / pedidos).

## Arquitetura proposta

Uma operação contínua. Capacidades aparecem conforme o estado. O contexto viaja.

```
Home pública (intocada em posicionamento)
        │
        ▼
Cockpit / Agora          ← fila de trabalho derivada do estado
        │
        ├── Conversas    ← superfície primária (thread + painel)
        │       contexto: cliente · empresa · negociação · cotação · pedido · envio · atividade
        ├── Negociações  ← o mesmo fio, visto pelo estado comercial
        ├── Pedidos      ← o mesmo fio, visto pelo pedido
        ├── Envios       ← o mesmo fio, visto pela logística
        ├── Equipe       ← recorte do gestor (carga, exceções)
        └── Configuração ← resultado das integrações, não os nomes técnicos
```

Se os nomes dos menus sumirem, a estrutura ainda faz sentido: **o que precisa de mim agora → a conversa → o que está ligado a ela**.

O operador não navega o sistema. Ele realiza o trabalho.

## Decisões

1. **Fila de trabalho é a home interna.** Itens nascem do estado (não de um kanban decorativo): identificar, responder, cotar, aprovar, criar pedido, confirmar, contratar frete, resolver exceção, retornar cliente.
2. **Painel de contexto reutilizável.** Mesmo componente na conversa, na negociação, no pedido e no envio. Ação primária vive no contexto, não num menu escondido.
3. **Frank não é módulo.** Rascunha a mensagem no fio. Nunca envia sozinho.
4. **Operador e gestor compartilham o Cockpit.** Só muda o recorte: o gestor vê exceções e carga da equipe primeiro.
5. **Mobile nativo.** Bottom nav (Agora, Conversas, Mais) + sheet. Desktop: rail estreito + painel lateral.
6. **Listagens existem para achar, não para operar.** Negociações / pedidos / envios são índices. O trabalho acontece no contexto.
7. **Integrações no bastidor.** “3 opções encontradas”, não “Melhor Envio API”.
8. **Home pública intocada em posicionamento.** Headline, fio, cinco momentos, humano no centro. Sem redesign de landing.

## Contrato de rotas (alvo)

| Rota | Papel |
|---|---|
| `/` | Home pública (posicionamento preservado) |
| `/cockpit` | Fila de trabalho (Agora) |
| `/cockpit/conversas` | Lista + thread master-detail |
| `/cockpit/conversas/[id]` | Superfície primária de operação |
| `/cockpit/negociacoes` | Índice comercial |
| `/cockpit/negociacoes/[id]` | Mesmo contexto, recorte negociação |
| `/cockpit/pedidos` | Índice de pedidos |
| `/cockpit/pedidos/[id]` | Mesmo contexto, recorte pedido |
| `/cockpit/logistica` | Índice de envios |
| `/cockpit/logistica/[id]` | Mesmo contexto, recorte logística |
| `/cockpit/gestao` | Recorte do gestor |
| `/cockpit/config` | Resultado das conexões |

Não criar de propósito: CRM separado, Inbox separado, dashboard de gráficos, FinOps no caminho do operador, simulador como módulo, knowledge, playbooks, audit log, salas do launcher.

Rotas técnicas da auditoria (`/cockpit/status`, `/cockpit/audit`, `/cockpit/domine`, freight-simulator, etc.) saem do menu do operador e, quando necessárias, vivem em Configuração / Sistema — nunca no fio comercial.

## Fluxos que não podem quebrar

1. **Atlas** — Marina escolheu Movvi → aprovar cotação → gerar pedido → confirmar → contratar frete, sem sair do fio.
2. **Campinas** — lead sem ficha → identificar cliente → a negociação anda.
3. **São Lucas** — pergunta hospitalar → responder com rascunho do Frank.
4. **Recife** — pedido confirmado → contratar frete → devolver rastreio no WhatsApp.
5. **Norte** — exceção em Ananindeua → intervir → avisar o cliente.
6. **Verde** — entregue → retornar ao cliente.

## Relação com #357

A #357 introduz `CockpitWorkspaceShell` e substitui o launcher por uma fila. Isso é o passo certo de direção, mas ainda:

- filtra a fila por módulo (Conversas / Frete / Pedidos);
- o painel de contexto é um resumo do item selecionado, não o fio comercial completo;
- atalhos continuam apontando para `/conversas`, `/logistica`, `/pedidos` como sistemas separados;
- o operador ainda precisa escolher “em qual módulo estou”.

Esta PR define o contrato para a Parte 2: a fila deriva do **estado da entidade**, o painel carrega cliente + negociação + cotação + pedido + envio, e a ação primária acontece no contexto — sem troca de módulo.

## Teste de realidade

1. Se eu remover todos os nomes dos menus, a estrutura ainda faz sentido para um operador?
   Sim: o que precisa de mim agora → a conversa → o que está ligado a ela.
2. O operador está navegando pelo sistema ou está realizando o trabalho?
   A segunda resposta é a experiência desejada.
