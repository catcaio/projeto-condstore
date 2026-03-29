# Scorecard de Piloto — Rastreamento Semanal

**Propósito:** Uma página de acompanhamento preenchida toda segunda-feira. Mede adoção, velocidade, risco e ROI de forma consolidada.

**Responsável:** CONDSTORE OS

**Frequência:** Toda segunda-feira (início de semana útil)

**Tempo de preenchimento:** 15 minutos (coleta de dados + preenchimento)

---

## Template

```
# SCORECARD PILOTO — [Nome do Cliente]

Semana: __/4 | Período: __/__/__ a __/__/__
Responsável CONDSTORE OS: _____________________
Data de preenchimento: __/__/____

---

## 📊 MÉTRICA DE ADOÇÃO — Está usando?

| Métrica | Semana 1 | Semana 2 | Semana 3 | Semana 4 | Acumulado |
|---|---|---|---|---|---|
| Dias de uso (de 7) | ___ | ___ | ___ | ___ | ___ |
| Conversas abertas | ___ | ___ | ___ | ___ | ___ |
| Cotações geradas | ___ | ___ | ___ | ___ | ___ |
| Pedidos criados | ___ | ___ | ___ | ___ | ___ |
| Usuários ativos distintos | ___ / [total] | ___ | ___ | ___ | ___ |

**Status:** [ ] Nenhum uso [ ] Uso baixo (<30%) [ ] Uso médio (30-70%) [ ] Uso alto (>70%)

---

## ⚡ MÉTRICA DE VELOCIDADE — Quanto mais rápido?

- **Tempo médio de cotação (minutos):** ______ [comparar com baseline de ______ min]
  - Mudança: ↓ ___% (melhoria esperada: 90%+)
- **Operador ainda abre site de transportadora?** [ ] Sim [ ] Não [ ] Às vezes
- **Número de abas por pedido:** ______ [era ______ antes]

---

## 🚨 MÉTRICA DE RISCO — Há problemas?

- **Erros críticos abertos?** [ ] Não [ ] Sim — descrever:

  _________________________________________________________________

- **Tickets de suporte:** ______ | Categorias: _____________________

  _________________________________________________________________

- **NPS do operador (0-10):** ______
  - (Pergunta: "De 0 a 10, você recomendaria este sistema para outro operador?")

- **Satisfação do gestor:**
  - [ ] Muito satisfeito (vendo valor)
  - [ ] Satisfeito (acompanhando)
  - [ ] Indeciso (esperando mais dados)
  - [ ] Insatisfeito (questionando ROI)

---

## 💰 CÁLCULO DE ROI — Vale a pena?

**Dados de entrada:**

- Cotações solicitadas esta semana: ________
- Tempo cotação ANTES (baseline): ________ minutos
- Tempo cotação DEPOIS (agora): ________ minutos
- Diferença: ________ minutos

**Cálculo de horas economizadas:**

```
(Tempo antes − Tempo depois) × Cotações ÷ 60 = Horas economizadas

(_______ − _______) × _______ ÷ 60 = _______ horas
```

**Cálculo de valor:**

- Custo hora operador (do baseline): R$ ________
- Horas economizadas: ________ h
- **Economia desta semana: R$ ________** (horas × custo)

**Projeção para 30 dias:**

- Economia semanal média (até agora): R$ ________
- Projeção mensal: R$ ________ × 4 = **R$ ________**
- Setup fee do cliente: R$ ________
- **Payback simples: ________ semanas**

---

## 📝 OBSERVAÇÕES QUALITATIVAS

### O que funcionou bem esta semana?

_________________________________________________________________

_________________________________________________________________

### O que causou problema ou frustração?

_________________________________________________________________

_________________________________________________________________

### Comportamento do operador:

- [ ] Usa espontaneamente (sem ser lembrado)
- [ ] Usa quando pedido (precisa de incentivo)
- [ ] Resiste (prefere jeito antigo)

### Próxima ação prioritária:

_________________________________________________________________

---

## ✅ CHECKLIST DE REVISÃO

Preencher ANTES de conduzir **weekly-review.md** (sexta-feira):

- [ ] Dados de adoção estão completos
- [ ] Cálculo de ROI foi feito (mesmo que aproximado)
- [ ] Problemas técnicos foram listados
- [ ] NPS do operador foi perguntado
- [ ] Observações qualitativas foram capturadas
- [ ] Este scorecard foi salvo (compartilhado ou registrado)

---

## 📞 PRÓXIMO PASSO

Este scorecard vai servir como BASE para a conversa de **weekly-review.md** na sexta-feira.

Prepare-se para mostrar os números para o cliente.
```

---

## Dicas de preenchimento

### Coleta de dados (segunda-feira de manhã)

**Crie um ritual:**
- **08h45:** Abra o cockpit do cliente, extraia números da semana
- **09h:** Revise logs para erros não reportados
- **09h15:** Preencha scorecard
- **09h30:** Envie link para cliente consultar (opcional)

### Adoção
- "Dias de uso" = dias em que houve pelo menos 1 ação (login, cotação, criação de pedido)
- Conversas/cotações/pedidos são ACUMULADOS (semana 1 começa em 0, semana 2 é semana 1 + semana 2, etc.)

### Velocidade
- Use o tempo mostrado no cockpit quando cotação chega
- Se não tiver timestamp preciso, use cronômetro no seu próprio teste
- Percentual de melhoria = (Antes − Depois) ÷ Antes × 100

### ROI
- Números aproximados são ACEITÁVEIS
- Se não tiver custo/hora exato, use R$ 40–60 de referência
- A projeção é hipotética — serve para mostrar tendência, não promessa

### Risco
- "Erro crítico" = algo que bloqueia operação (webhook falho, API timeout que impede cotação)
- "Ticket de suporte" = pergunta do cliente que precisou responder
- NPS é pergunta direta — não é satisfação em geral, é "você recomendaria?"

---

## Exemplo preenchido (Semana 1)

```
SCORECARD PILOTO — Distribuidora ABC

Semana: 1/4 | Período: 10/03 a 14/03
Responsável CONDSTORE OS: João Silva
Data: 13/03/2026

---

ADOÇÃO:
| Métrica | Semana 1 |
| Dias de uso | 4 / 7 |
| Conversas abertas | 8 |
| Cotações geradas | 8 |
| Pedidos criados | 5 |
| Usuários ativos | 2 / 5 |

Status: Uso médio (atrasos no WhatsApp impediram segunda-feira)

---

VELOCIDADE:
- Tempo médio de cotação: 2.5 min [era 12 min]
- Mudança: ↓ 79% ✓
- Operador ainda abre site? Não (preferiu cockpit)
- Abas por pedido: 1 [era 4]

---

RISCO:
- Erros críticos? Não
- Tickets: 2 (dúvida sobre Braspress sem retorno, dúvida sobre status de pedido)
- NPS operadora: 8/10
- Satisfação gestor: Acompanhando (viu os 5 primeiros pedidos)

---

ROI:
- Cotações semana 1: 8
- Tempo antes: 12 min
- Tempo depois: 2.5 min
- Diferença: 9.5 min
- Horas economizadas: 9.5 × 8 ÷ 60 = 1.27 horas
- Custo hora: R$ 45
- Economia semana 1: 1.27 × 45 = R$ 57
- Projeção 30 dias: R$ 57 × 4 = R$ 228
- Setup fee: R$ 600
- Payback: 600 ÷ 228 = 2.6 semanas

---

OBSERVAÇÕES:
Funcionou: Fluxo é intuitivo. Operadora pegou o sistema rápido. Cotação em segundos impressionou.

Problema: Tarde de segunda não conseguiu usar porque Twilio tava instável. Resolvemos terça.

Operador: Usa espontaneamente depois da 3ª vez. Agora abre cockpit sem pedir.

Ação prioritária: Configurar tabela de retorno no Braspress (pedido de segunda semana)

✓ Tudo preenchido
```

---

## Exemplo preenchido (Semana 4)

```
SCORECARD PILOTO — Distribuidora ABC

Semana: 4/4 | Período: 31/03 a 04/04
Responsável CONDSTORE OS: João Silva
Data: 01/04/2026

---

ADOÇÃO (ACUMULADO):
| Métrica | Semana 4 | Acumulado |
| Dias de uso | 7 / 7 | 27 / 28 |
| Conversas abertas | 16 | 45 |
| Cotações geradas | 28 | 73 |
| Pedidos criados | 22 | 55 |
| Usuários ativos | 4 / 5 | 5 / 5 |

Status: Uso muito alto — quase 100% da operação

---

VELOCIDADE:
- Tempo médio de cotação: 0.45 min [era 12 min]
- Mudança: ↓ 96% ✓✓✓
- Operador abre site? Não (100% cockpit agora)
- Abas por pedido: 1 [era 4]

---

RISCO:
- Erros críticos? Não
- Tickets: 0 (nenhuma dúvida nova)
- NPS operadora: 9/10
- Satisfação gestor: Muito satisfeito (quer adicionar mais 2 operadores)

---

ROI:
- Cotações semana 4: 28
- Tempo antes: 12 min
- Tempo depois: 0.45 min
- Diferença: 11.55 min
- Horas economizadas: 11.55 × 28 ÷ 60 = 5.39 horas
- Custo hora: R$ 45
- Economia semana 4: 5.39 × 45 = R$ 243
- Projeção mensal (média 4 semanas): [57 + 89 + 165 + 243] ÷ 4 = R$ 138.50/semana × 4 = R$ 554/mês
- Setup fee: R$ 600
- Payback: 600 ÷ 554 = 1.08 meses ✓

---

OBSERVAÇÕES:
Funcionou: Tudo. Operadora está operando sozinha. Gestor vê painel todos os dias.

Problema: Nenhum bloqueante. Melhorias sugeridas: mais relatórios.

Operador: Quer continuar 100%. Pediu treinamento para outro operador.

Ação prioritária: Discutir expansão (contrato full ou próxima empresa)

✓ Tudo preenchido
```
