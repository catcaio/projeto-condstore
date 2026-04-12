# Onboarding — Fluxo de implantação

**Duração típica:** 5–7 dias corridos (dependendo da agilidade do cliente)
**Responsável CONDSTORE OS:** 1 pessoa acompanha o piloto do início ao fim

---

## Visão geral

```
[FASE 1] Coleta de dados            (Dia -3 a -1)
         ↓
[FASE 2] Setup técnico              (Dia 1)
         ↓
[FASE 3] Validação interna          (Dia 1 — após setup)
         ↓
[FASE 4] Treinamento do cliente     (Dia 2)
         ↓
[FASE 5] Início assistido           (Dia 2–3)
         ↓
[FASE 6] Operação autônoma          (Dia 4 em diante)
         ↓
[REVISÃO] 30 dias                   (Dia 30)
```

---

## FASE 1 — Coleta de dados (Dia -3 a -1)

**Quem faz:** CONDSTORE OS envia formulário, cliente preenche

**Objetivo:** ter todos os dados necessários antes de tocar em qualquer configuração técnica.

**Ações:**
1. Enviar e-mail com formulário de dados (`onboarding-data-required.md`)
2. Aguardar preenchimento completo (deadline: Dia -1)
3. Validar dados recebidos:
   - CEP de origem: formato correto, existe no Brasil
   - Número WhatsApp: +55 com DDD
   - Arquivo de tabela de frete: formato legível
4. Iniciar processo Twilio em paralelo (pode levar até 3 dias úteis)

**Saída esperada:** checklist de pré-requisitos 100% verde (`onboarding-checklist.md` — BLOCO 0)

**Bloqueio comum:** cliente demora para preencher formulário ou não tem tabela de frete formatada.
Mitigação: ligar e preencher junto via WhatsApp/videoconferência.

---

## FASE 2 — Setup técnico (Dia 1)

**Quem faz:** CONDSTORE OS (sem necessidade de presença do cliente)
**Duração estimada:** 2–4 horas

**Ordem de execução:**

### 2.1 Criar tenant

```
1. Criar registro no sistema com dados do cliente
2. Configurar slug, CNPJ, plano inicial (Starter)
3. Verificar status: unlocked
```

### 2.2 Configurar WhatsApp

```
1. Adicionar TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN ao tenant
2. Configurar webhook no Twilio: POST /api/whatsapp/incoming
3. Testar recebimento: enviar mensagem de teste
4. Confirmar que aparece no sistema
```

### 2.3 Configurar carriers

```
Para Melhor Envio:
  1. Adicionar token ao tenant
  2. Testar cotação com CEP real
  3. Confirmar resposta < 5s

Para cada tabela de carrier:
  1. Validar formato do arquivo
  2. Importar dados (carrier_rate_rows + carrier_zones)
  3. Criar carrier_policies
  4. Testar cotação com CEP de destino conhecido
```

### 2.4 Criar usuários

```
Para cada usuário da lista:
  1. Criar conta
  2. Atribuir papel e tenant
  3. Enviar e-mail de acesso
```

### 2.5 Configurar CEP de origem

```
1. Atualizar ORIGIN_CEP com CEP de despacho do cliente
2. Validar formato (8 dígitos)
```

**Saída esperada:** sistema configurado, usuários com acesso, carriers funcionando.

---

## FASE 3 — Validação interna (Dia 1 — após setup)

**Quem faz:** CONDSTORE OS, sem cliente presente
**Duração:** 30–60 minutos

**Objetivo:** garantir que o ambiente está correto antes de envolver o cliente.

**Executar o fluxo completo com conta de teste:**

1. Enviar mensagem para o número do cliente → confirmar inbox
2. Abrir conversa → confirmar que aparece no cockpit
3. Solicitar cotação com CEP de destino real → confirmar pelo menos 1 opção
4. Criar pedido → confirmar que aparece na fila de logística
5. Verificar painel de pedidos → confirmar que pedido está visível

**Se qualquer passo falhar:**
- Resolver antes de contatar o cliente
- Não agendar treinamento com ambiente quebrado

**Saída esperada:** fluxo E2E funcional, `onboarding-checklist.md` BLOCO 5 completo.

---

## FASE 4 — Treinamento do cliente (Dia 2)

**Quem faz:** CONDSTORE OS + operadores do cliente
**Duração:** 45–60 minutos
**Formato:** videoconferência com compartilhamento de tela (ou presencial)

**Agenda do treinamento:**

| Bloco | Conteúdo | Duração |
|---|---|---|
| Abertura | Contextualizar o que vão aprender | 5 min |
| Inbox WhatsApp | Como receber e abrir conversas | 10 min |
| Cotação | Como solicitar e interpretar cotação | 10 min |
| Pedido | Como criar e acompanhar | 10 min |
| Logística | Fila de shipments, SLA | 5 min |
| Gestor | Painel de métricas | 5 min |
| Dúvidas | Abertas | 10 min |

**Importante durante o treinamento:**
- O operador deve executar o fluxo sozinho pelo menos 1 vez
- Não apresentar nada fora do MVP (sem configurações técnicas, sem admin)
- Anotar dúvidas que revelam gaps de UX ou expectativas equivocadas

**Ao final do treinamento:**
- Confirmar que cada operador sabe: abrir conversa, cotar, criar pedido
- Enviar link de referência: `docs/mvp/cockpit-map.md`
- Combinar canal de suporte (WhatsApp ou Slack)

**Saída esperada:** operadores autossuficientes para o fluxo básico.

---

## FASE 5 — Início assistido (Dia 2–3)

**Quem faz:** cliente opera, CONDSTORE OS acompanha
**Duração:** 48 horas

Ver plano detalhado em `onboarding-48h-plan.md`.

**Princípio:** cliente usa o sistema com pedidos reais, responsável CONDSTORE OS disponível para dúvidas e problemas.

**Não fazer durante a fase assistida:**
- Não modificar configurações sem comunicar o cliente
- Não interpretar dados pelo cliente — ele aprende operando
- Não resolver problemas de uso do operador — orientar, não fazer por ele

**Saída esperada:** pelo menos 3 pedidos reais criados via sistema.

---

## FASE 6 — Operação autônoma (Dia 4 em diante)

**Quem faz:** cliente opera de forma autônoma
**CONDSTORE OS:** suporte pontual, monitoramento passivo

**Acompanhamento semanal:**
- Check-in rápido (15 min) às sextas-feiras
- Perguntar: quantos pedidos, algum problema, alguma dúvida
- Registrar métricas: pedidos/semana, cotações/semana, tempo médio

**Monitoramento passivo:**
- Verificar semanalmente se sistema está ativo e recebendo webhooks
- Alertas de erro crítico devem gerar contato imediato

**Saída esperada:** cliente operando de forma independente com volume crescente.

---

## REVISÃO — 30 dias (Dia 30)

**Quem faz:** CONDSTORE OS + decisor do cliente (não só o operador)
**Duração:** 30–45 minutos
**Objetivo:** avaliar se o piloto gerou valor e decidir continuidade

**Agenda:**

| Item | Conteúdo |
|---|---|
| Dados do período | Pedidos criados, cotações realizadas, carriers usados |
| Experiência do operador | O que funcionou, o que foi difícil |
| Dores resolvidas | Comparar com situação pré-produto |
| Dores que persistem | O que o produto não resolveu |
| Decisão | Continuar, ajustar plano, ou encerrar |

**Material para preparar antes da revisão:**
- Total de pedidos criados no período
- Total de cotações realizadas
- Carrier mais usado
- Tempo médio de uso por operador/semana

**Saída esperada:** decisão formal sobre continuidade + plano de próximos 30 dias se continuar.

---

## Riscos e mitigações comuns

| Risco | Frequência | Mitigação |
|---|---|---|
| Cliente demora para enviar dados | Alta | Ligar e preencher junto |
| Twilio leva mais de 3 dias | Média | Iniciar processo antes do setup |
| Tabela de frete mal formatada | Média | Pedir modelo de exemplo antecipado |
| Operador não usa o sistema | Média | Check-in diário nas primeiras 48h |
| Cliente espera automação | Baixa | Alinhar expectativas na demo |
| Carrier API lenta | Baixa | Fallback para tabela própria |
