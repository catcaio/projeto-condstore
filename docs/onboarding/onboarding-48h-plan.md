# Onboarding — Plano das primeiras 48 horas

**Início:** imediatamente após treinamento concluído
**Objetivo:** garantir que o cliente opera de forma real e confiante nas primeiras 48h

---

## Premissa

As primeiras 48h definem o comportamento do piloto. Se o operador não usar o sistema nos primeiros 2 dias, a chance de adoção cai drasticamente.

O responsável CONDSTORE OS precisa estar ativamente presente — não monitorando, acompanhando.

---

## Dia 1 — Setup validado + primeiros pedidos reais

### Manhã (abertura do dia)

**Horário sugerido:** 08h–09h (ou horário de abertura da operação do cliente)

**Ação CONDSTORE OS:**
- Entrar em contato com o operador: *"Bom dia! Sistema está funcionando. Quando tiver a primeira mensagem, me avise."*
- Verificar internamente: webhook ativo, inbox acessível, carriers respondendo

**Ação do cliente:**
- Operador começa o dia com cockpit aberto
- Aguarda primeira mensagem real de WhatsApp

---

### Primeira mensagem real

**Quando chegar a primeira mensagem:**

1. Operador abre o inbox → vê a mensagem
2. Se surgir dúvida → responsável CONDSTORE OS disponível imediatamente por WhatsApp
3. Operador segue o fluxo: conversa → cotação → pedido

**Meta do dia 1:** pelo menos 2 pedidos reais criados via cockpit

---

### Meio do dia (check-in às 12h)

**CONDSTORE OS pergunta ao operador:**
- *"Como está indo? Conseguiu usar o sistema pela manhã?"*
- *"Alguma dificuldade específica?"*
- *"Conseguiu criar algum pedido?"*

**Se não usou ainda:**
- Perguntar o motivo
- Se for técnico: resolver imediatamente
- Se for comportamental (operador prefere WhatsApp do celular): conversar sobre isso

---

### Fim do dia (check-in às 17h)

**CONDSTORE OS verifica no sistema:**
- Quantas conversas abertas
- Quantas cotações geradas
- Quantos pedidos criados

**CONDSTORE OS pergunta:**
- *"Como foi o dia? Quantos pedidos passaram pelo sistema?"*
- *"Alguma situação que o sistema não cobriu bem?"*

**Registrar:**
- Número de pedidos do dia 1
- Dificuldades relatadas
- Ajustes necessários (se houver)

---

### Problemas comuns no Dia 1 e respostas

**"A mensagem não apareceu no inbox"**
→ Verificar webhook Twilio. Testar envio manual. Resolver em < 30 minutos.

**"O sistema demorou para carregar a cotação"**
→ Verificar Melhor Envio API. Se timeout: fallback para tabelas. Orientar operador.

**"Não sei qual carrier escolher"**
→ Orientar: menor preço = Melhor Envio (geralmente), menor prazo = Braspress ou Movvi. O cliente decide por suas regras de negócio.

**"O pedido sumiu depois que criei"**
→ Verificar na aba "Pedidos" e "Logística". Pedido criado com status CREATED está na fila de logística.

**"Tentei mandar mensagem e não apareceu nada no WhatsApp do cliente"**
→ Lembrar: o sistema não envia mensagem automaticamente. O operador escreve a resposta no campo de texto e clica enviar.

---

## Dia 2 — Operação assistida com foco em autonomia

### Manhã (abertura)

**CONDSTORE OS:**
- Verificar passivamente se há atividade no sistema (sem contato se tudo estiver normal)
- Só entrar em contato se não houver nenhuma atividade até 10h

**Meta do dia 2:** operador usa o sistema sem precisar perguntar para o responsável CONDSTORE OS

---

### Ao longo do dia

**Postura CONDSTORE OS:** disponível, mas não proativo a menos que solicitado

**Se o operador contatar:**
- Responder em até 30 minutos
- Preferir orientar do que resolver por ele: *"O botão de cotação fica nessa conversa, canto superior direito — você consegue achar?"*

---

### Fim do dia 2 (check-in final)

**CONDSTORE OS verifica no sistema:**
- Total de pedidos nos 2 dias
- Total de cotações
- Carrier mais usado
- Algum erro ou falha registrado

**CONDSTORE OS pergunta ao operador e/ou gestor:**
- *"Como foram os 2 primeiros dias?"*
- *"O que ficou mais fácil do que antes?"*
- *"O que ainda parece difícil?"*
- *"Tem alguma situação que tentou fazer e não conseguiu?"*

---

### Avaliação das 48h

**Piloto saudável:** seguir para operação autônoma (FASE 6 de `onboarding-flow.md`)

**Piloto com atenção:** algum critério abaixo não foi atingido — acompanhar por mais 48h antes de declarar autônomo

**Piloto em risco:** menos de 1 pedido criado, operador não aderiu — escalar para conversa com decisor do cliente

---

## Métricas das primeiras 48h

| Métrica | Meta mínima | Meta ideal |
|---|---|---|
| Pedidos criados | ≥ 2 | ≥ 5 |
| Cotações geradas | ≥ 3 | ≥ 8 |
| Conversas abertas no inbox | ≥ 2 | ≥ 5 |
| Erros críticos não resolvidos | 0 | 0 |
| Operador usou sem ajuda | ≥ 1 vez | Maioria das vezes |

---

## Canal de suporte das 48h

**Criar um grupo WhatsApp ou Slack com:**
- Operadores principais do cliente
- Responsável CONDSTORE OS
- (Opcional) Gestor do cliente

**Nome sugerido:** `[Cliente] — CONDSTORE Setup`

**Regras do canal:**
- Disponível para dúvidas 08h–18h (dias úteis)
- Resposta em até 30 minutos
- Problemas técnicos críticos: ligar diretamente (não só mensagem)

**Após as 48h:**
- Canal continua ativo para suporte semanal durante todo o piloto
- Frequência de contato reduz para 1–2 vezes por semana

---

## Relatório das 48h

Ao final do Dia 2, registrar internamente:

```
RELATÓRIO 48H — [Nome do Cliente]
Data: DD/MM/AAAA

MÉTRICAS:
- Pedidos criados: X
- Cotações geradas: X
- Conversas abertas: X

SITUAÇÃO:
- [ ] Saudável — seguir para operação autônoma
- [ ] Atenção — acompanhar mais 48h
- [ ] Risco — escalar para decisor

PROBLEMAS REPORTADOS:
1. [descrição] — [status: resolvido / pendente]

DÚVIDAS COMUNS:
1. [descrição]

PRÓXIMO CONTATO AGENDADO:
Data: DD/MM — Tipo: check-in semanal / chamada de revisão
```
