# Demo MVP CONDSTORE OS — Índice

**Objetivo:** Tornar a demonstração do MVP 100% reproduzível por qualquer pessoa do time, sem improviso.

---

## Arquivos

### [demo-script.md](./demo-script.md)
**Roteiro completo de 20 minutos**

Do primeiro "olá" ao convite para piloto. Inclui:
- Abertura com pergunta de dor
- Falas exatas para cada etapa
- Respostas para perguntas frequentes
- Sinais de fit e no-fit
- Falas a evitar

**Leia antes da primeira demo.**

---

### [demo-flow.md](./demo-flow.md)
**Fluxo técnico passo a passo**

Os 7 passos exatos da demo, com:
- Ação do operador em cada etapa
- Resposta esperada do sistema
- O que falar em cada momento
- Pausas obrigatórias para o cliente falar
- O que fazer se algo der errado

**Use como referência durante a demo (segunda tela ou impresso).**

---

### [demo-checklist.md](./demo-checklist.md)
**Checklist de preparação e execução**

- Ambiente ativo e dados carregados
- WhatsApp configurado e testado
- Fluxo obrigatório (etapas que não podem ser puladas)
- O que NÃO mostrar e NÃO prometer
- Respostas para problemas técnicos
- Ações após a demo

**Executar item a item antes de cada apresentação.**

---


### [demo-tenant-runbook.md](./demo-tenant-runbook.md)
**Setup técnico reproduzível do tenant de demo/piloto**

Inclui:
- comando único de seed (`npm run seed:demo-tenant`)
- variáveis opcionais para tenant/senha
- garantias de idempotência e isolamento multi-tenant
- validação objetiva pós-seed

**Executar antes de cada demo e no bootstrap de piloto.**

---

### [demo-dataset.md](./demo-dataset.md)
**Dados fictícios padronizados**

- Cliente: Carlos Andrade — Construdis Materiais LTDA
- Produto: 12x Cimento CP-II 50kg
- CEP destino: 13480-000 (Limeira/SP)
- Resultado esperado da cotação (3 carriers)
- Mensagem de abertura do WhatsApp
- Resposta padrão do operador

**Carregar no ambiente de demo antes de cada apresentação.**

---

## Ordem de leitura

**Antes da primeira demo:**
1. `demo-tenant-runbook.md` — executar o seed reproduzível
2. `demo-dataset.md` — entender os dados que estarão no sistema
3. `demo-script.md` — aprender o roteiro completo
4. `demo-flow.md` — entender cada etapa tecnicamente
5. `demo-checklist.md` — preparar o ambiente

**Antes de cada demo subsequente:**
1. `demo-tenant-runbook.md` — reaplicar seed baseline
2. `demo-checklist.md` — executar item a item (10 minutos)
3. `demo-flow.md` — revisar as etapas (5 minutos)

---

## Princípio da demo

> A demo não é sobre o produto. É sobre o problema do cliente sendo resolvido em tempo real.

Cada etapa mostra uma dor sendo eliminada. O cliente não compra software — compra o fim de um problema.

---

## O que a demo cobre

| Etapa | Dor eliminada |
|---|---|
| Inbox com histórico | "Meu operador não sabe quem é o cliente antes de responder" |
| Cotação em segundos | "Cada cotação leva 15 minutos no site da transportadora" |
| Criação de pedido | "O pedido fica perdido entre WhatsApp e planilha" |
| Fila de logística | "Não sei quantos pedidos estão abertos hoje" |
| Visão do gestor | "Preciso perguntar pro operador para saber o status" |

---

## O que a demo não cobre (propositalmente)

- Automação de respostas — não existe no MVP
- IA — não ativa no MVP
- Integrações com ERP — fora do escopo
- Roadmap — não prometer nada além do que foi mostrado

Para mais detalhes sobre limites: [`docs/mvp/boundaries.md`](../mvp/boundaries.md)
