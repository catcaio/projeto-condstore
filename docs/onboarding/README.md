# Onboarding de Pilotos — CONDSTORE OS

Processo oficial para implantação de clientes piloto no MVP.

**Duração típica:** 5–7 dias até operação autônoma
**Duração do piloto:** 30 dias com revisão formal ao final

---

## Índice

### [onboarding-data-required.md](./onboarding-data-required.md)
**Dados obrigatórios do cliente**

Tudo que precisa ser coletado antes de iniciar qualquer configuração. Inclui:
- Dados da empresa e CNPJ
- Endereço de origem (CEP de despacho)
- Número WhatsApp e conta Twilio
- Carriers utilizados e tabelas de frete
- Lista de usuários com papéis
- Template de e-mail para coleta

**Leia e envie ao cliente antes de qualquer outra etapa.**

---

### [onboarding-checklist.md](./onboarding-checklist.md)
**Checklist completo de implantação**

8 blocos sequenciais cobrindo desde pré-requisitos até aceite do piloto:
- BLOCO 0: Pré-requisitos e dados
- BLOCO 1: Criação do tenant
- BLOCO 2: Conexão WhatsApp (Twilio)
- BLOCO 3: Configuração de carriers
- BLOCO 4: Criação de usuários
- BLOCO 5: Validação E2E
- BLOCO 6: Treinamento
- BLOCO 7: Início assistido
- BLOCO 8: Aceite

**Executar item a item. Não pular bloco.**

---

### [onboarding-flow.md](./onboarding-flow.md)
**Fluxo de implantação passo a passo**

6 fases com duração, responsabilidades, ações e riscos comuns:
1. Coleta de dados (Dia -3 a -1)
2. Setup técnico (Dia 1)
3. Validação interna (Dia 1)
4. Treinamento do cliente (Dia 2)
5. Início assistido (Dia 2–3)
6. Operação autônoma (Dia 4+)

**Referência para planejar o cronograma do piloto.**

---

### [onboarding-48h-plan.md](./onboarding-48h-plan.md)
**Plano detalhado das primeiras 48 horas**

- Dia 1: setup validado + primeiros pedidos reais
- Dia 2: operação assistida com foco em autonomia
- Check-ins obrigatórios (manhã + meio do dia + fim do dia)
- Problemas comuns e respostas
- Métricas das 48h
- Modelo de relatório interno

**Usar como guia hora a hora nos primeiros 2 dias.**

---

### [onboarding-acceptance.md](./onboarding-acceptance.md)
**Critérios de aceite do piloto**

- Aceite técnico (pós-setup)
- Aceite operacional (48h)
- Aceite do piloto (30 dias)
- O que NÃO é critério de aceite
- Checklist formal para assinar com cliente
- Roteiro de revisão de 30 dias
- Registro pós-piloto

**Definição objetiva de "piloto válido" e "piloto em risco".**

---

## Ordem de uso

**Antes do piloto:**
1. `onboarding-data-required.md` → enviar ao cliente
2. `onboarding-flow.md` → planejar cronograma

**Durante o setup (Dia 1):**
3. `onboarding-checklist.md` → executar bloco a bloco

**Primeiras 48h:**
4. `onboarding-48h-plan.md` → seguir check-ins e metas

**Ao final do setup:**
5. `onboarding-acceptance.md` → critérios técnicos + documento de aceite

**Ao final de 30 dias:**
6. `onboarding-acceptance.md` → revisão de 30 dias + registro de resultado

---

## Princípio do onboarding

> O cliente não compra software. Compra o resultado de ter a operação funcionando.

O onboarding só termina quando o cliente está operando de forma autônoma com pedidos reais. Até lá, o responsável CONDSTORE OS está presente.

---

## Referências relacionadas

- [`docs/mvp/mvp-definition.md`](../mvp/mvp-definition.md) — o que o produto faz e não faz
- [`docs/mvp/cockpit-map.md`](../mvp/cockpit-map.md) — o que o operador vai usar
- [`docs/mvp/boundaries.md`](../mvp/boundaries.md) — o que não prometer ao cliente
- [`docs/demo/demo-script.md`](../demo/demo-script.md) — roteiro de demonstração (pré-onboarding)
