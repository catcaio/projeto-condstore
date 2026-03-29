# ROI e Prova de Valor — Pacote de Documentação

Guia oficial para medir, rastrear e provar o valor do CONDSTORE OS nos pilotos.

**Objetivo geral:** Transformar cada piloto bem-sucedido em prova social escalável para vender os próximos pilotos.

---

## Arquivos deste diretório

### [roi-metrics.md](./roi-metrics.md)

**Quando usar:** Antes de iniciar qualquer piloto

**O que faz:** Catálogo centralizado de todas as métricas que serão rastreadas — adoção, velocidade, volume, qualidade e ROI

**Conteúdo:**
- Métricas de adoção (dias de uso, conversas, cotações, pedidos)
- Métricas de velocidade (tempo de cotação antes vs. depois)
- Métricas de volume (pedidos criados, carriers usados)
- Métricas de qualidade (erros críticos, NPS, satisfação)
- Métricas de ROI (horas economizadas, payback period)

**Tempo de leitura:** 10 minutos

**Próxima ação:** Passe para baseline-capture.md

---

### [baseline-capture.md](./baseline-capture.md)

**Quando usar:** Primeiro dia do piloto, antes de qualquer uso

**O que faz:** Template para capturar situação atual — números, dores, ferramentas. A comparação ao final é feita contra isso.

**Conteúdo:**
- Informações da empresa (segmento, localização, tamanho)
- Operação atual (quantos operadores, quantos pedidos/mês)
- Processo de cotação (quais ferramentas usam, tempo por cotação)
- Gestão de pedidos (visibilidade, pedidos perdidos)
- Baseline de números (tabela com valores iniciais)
- Expectativa qualitativa (o que espera resolver)

**Tempo de preenchimento:** 30–45 minutos (em conversa com cliente)

**Próxima ação:** Inicie pilot-scorecard.md na semana 1

---

### [pilot-scorecard.md](./pilot-scorecard.md)

**Quando usar:** Toda segunda-feira durante 4 semanas do piloto

**O que faz:** Uma página para rastrear adoção, velocidade, risco e ROI de forma consolidada

**Conteúdo:**
- Métrica de adoção (dias de uso, conversas, cotações, pedidos)
- Métrica de velocidade (tempo de cotação, abas por pedido)
- Métrica de risco (erros críticos, tickets, NPS)
- Cálculo de ROI (economia semanal e projeção mensal)
- Observações qualitativas (o que funcionou, o que não)

**Tempo de preenchimento:** 15 minutos (recolher dados + preencher)

**Próxima ação:** Use antes de weekly-review.md toda sexta

---

### [weekly-review.md](./weekly-review.md)

**Quando usar:** Toda sexta-feira com operador (e gestor se possível)

**O que faz:** Roteiro de 20 minutos para conversa semanal — mostrar números, ouvir problemas, orientar

**Conteúdo:**
- Checklist pré-call (5 min de preparação)
- Agenda da call (abertura → números → problemas → próximos passos)
- Script com frases padrão
- Exemplos de cenários (operador não usou, usou pouco, usou muito, tem erro)
- Registro pós-call (o que fazer depois)

**Tempo de call:** 15–20 minutos

**Próxima ação:** Registre resultado e prepare scorecard da semana seguinte

---

### [case-study-template.md](./case-study-template.md)

**Quando usar:** Ao final do piloto bem-sucedido (semana 4 + revisão de 30 dias)

**O que faz:** Template para converter números + depoimento em história de prova social

**Conteúdo:**
- Resumo executivo (1 parágrafo que responde: qual era o problema, como resolvemos, qual foi o resultado)
- Contexto (quem é a empresa, segmento, tamanho)
- O problema (descrição da dor antes do CONDSTORE OS)
- A solução (como o sistema funcionou)
- O resultado (tabela antes vs. depois)
- Depoimento do cliente (citação direta)
- Timeline do piloto
- O que funcionou (3 pontos fortes)
- O que foi desafio (2 desafios + solução)
- Lições para próximos pilotos
- Conclusão e status de continuidade

**Tempo de preenchimento:** 45 minutos (coleta + redação)

**Próxima ação:** Publicar em docs/pilots/ ou usar em pitch de próximos clientes

---

## Fluxo de uso completo

```
[DIA 1 — SEGUNDA]
└─→ Preencher baseline-capture.md
    (conversa com cliente, 30–45 min)

[SEMANA 1 — SEGUNDA-FEIRA]
└─→ Preencher pilot-scorecard.md — SEMANA 1
    (15 min)

[SEMANA 1 — SEXTA-FEIRA]
└─→ Conduzir weekly-review.md com operador
    (20 min call + 15 min registro)

[SEMANA 2 — SEGUNDA-FEIRA]
└─→ Preencher pilot-scorecard.md — SEMANA 2
    (15 min)

[SEMANA 2 — SEXTA-FEIRA]
└─→ Conduzir weekly-review.md com operador
    (20 min call + 15 min registro)

[SEMANA 3 — SEGUNDA-FEIRA]
└─→ Preencher pilot-scorecard.md — SEMANA 3
    (15 min)

[SEMANA 3 — SEXTA-FEIRA]
└─→ Conduzir weekly-review.md com operador
    (20 min call + 15 min registro)

[SEMANA 4 — SEGUNDA-FEIRA]
└─→ Preencher pilot-scorecard.md — SEMANA 4
    (15 min)

[SEMANA 4 — SEXTA-FEIRA]
└─→ Conduzir weekly-review.md com operador
    (20 min call + 15 min registro)
└─→ Preparar revisão formal de 30 dias

[DIA 30 — REVISÃO]
└─→ Conduzir revisão com cliente (veja docs/onboarding/onboarding-acceptance.md)
└─→ Decidir continuidade (contrato / estender / encerrar)

[PÓS-PILOTO — SUCESSO]
└─→ Preencher case-study-template.md
    (45 min de coleta + redação)
└─→ Publicar como prova social
```

---

## Sequência de leitura recomendada

### Para primeira vez (antes de primeiro piloto)
1. Leia **roi-metrics.md** completo — entenda o que será rastreado
2. Leia **baseline-capture.md** completo — entenda a estrutura de captura
3. Leia **pilot-scorecard.md** até "Exemplo preenchido (Semana 1)" — veja como fica

### Para cada piloto (repetir 4 vezes)
4. Semana 1: Preencha **baseline-capture.md** (dia 1) → **pilot-scorecard.md** (seg) → **weekly-review.md** (sex)
5. Semana 2–4: Repita scorecard + review toda semana

### Para sucesso comprovado
6. Preencha **case-study-template.md** completo
7. Revise exemplos em **case-study-template.md** — inspire-se na redação

---

## Dicas para manter consistência

### Baseline

- Quanto mais preciso, melhor a comparação ao final
- Números aproximados são aceitáveis
- A pergunta qualitativa "qual é a dor principal?" é ouro — use como referência no final

### Scorecard

- Preencha toda segunda, não deixe pra depois
- 15 minutos você tem — não é muito
- Dados aproximados OK (você quer tendência, não precisão exata)
- Acumule números (semana 2 = semana 1 + semana 2, não só semana 2)

### Weekly Review

- Telefone/videochamada, não e-mail
- Energia humana vende — comunique que você se importa com o resultado
- Sempre termine com próxima ação agendada
- Envie mensagem de agradecimento no WhatsApp 5 min depois

### Case Study

- Escreva enquanto a vitória está fresca (não deixa pro final do ano)
- Dados + emoção = poder de venda
- Revise que não menciona Frank, IA, automação ou features frozen
- Leia em voz alta — se soar artificial, reescreva

---

## Integração com documentação existente

Este pacote se integra com:

- **docs/onboarding/onboarding-flow.md** — fluxo de implementação
  - baseline-capture.md acontece no Dia 1 (FASE 2)
  - pilot-scorecard.md começa na FASE 5 (Início assistido)

- **docs/onboarding/onboarding-48h-plan.md** — métricas das primeiras 48h
  - Primeiros valores de pilot-scorecard.md vêm daqui (conversas, cotações, pedidos)
  - Métricas são as mesmas

- **docs/onboarding/onboarding-acceptance.md** — critérios de aceite
  - Métricas de aceite técnico (48h) → parte de scorecard SEMANA 1
  - Métricas de aceite operacional (48h) → parte de scorecard SEMANA 1
  - Métricas de aceite piloto (30 dias) → usadas em case-study-template.md

- **docs/product/gtm-mvp.md** — ROI calculado na proposta comercial
  - Validar que números em "ETAPA 6 — Estrutura de pricing" fazem sentido com dados reais
  - Use case-study-template.md para gerar prova social

---

## Exemplo de fluxo real

**Cliente:** Distribuidora de alimentos XYZ, 5 operadores

**Dia 1 (10/03):**
Preencher baseline-capture.md
- 120 pedidos/mês
- Tempo cotação: 12 min
- 4 ferramentas por pedido
- ~10 pedidos perdidos/mês
- Setup fee: R$ 600
- Custo hora: R$ 45

**Semana 1 — Seg (13/03):**
Preencher pilot-scorecard.md — Semana 1
- Dias de uso: 4/5
- Cotações: 8
- Pedidos: 5
- Tempo cotação: 2.5 min (↓ 79%)
- Economia: 1.27h × R$ 45 = R$ 57

**Semana 1 — Sex (14/03):**
Conduzir weekly-review.md
- Operador: "Gostei, mas não consegui segunda porque WhatsApp tava fora"
- Ação: Testar mais segunda semana

**Semana 4 — Seg (01/04):**
Preencher pilot-scorecard.md — Semana 4
- Dias de uso: 7/7
- Cotações (acumulado): 73
- Pedidos (acumulado): 55
- Tempo cotação: 28 seg (↓ 96%)
- Economia semanal: 5.39h × R$ 45 = R$ 243
- Projeção mensal: R$ 555

**Dia 30 (30/03):**
Revisão formal com cliente
- Resultados positivos? Sim
- Continua? Sim, 12 meses

**Pós-piloto:**
Preencher case-study-template.md
- Publicado como prova social
- Usado em pitch para cliente 2

---

## KPIs do pacote ROI

Sim, o próprio pacote tem métricas de sucesso:

| Métrica | Target | Frequência |
|---|---|---|
| Baselines capturados | 100% (1 por piloto) | Dia 1 de cada piloto |
| Scorecards preenchidos | 100% (4 por piloto) | Toda segunda, 4x |
| Weekly reviews conduzidas | 100% (4 por piloto) | Toda sexta, 4x |
| Case studies criados | 100% de pilotos bem-sucedidos | Após dia 30 |
| Tempo piloto ROI | Acumulado | Depois de 4 pilotos |
| Prova social gerada | 3–5 case studies por semestre | Acumulado |

---

## Troubleshooting

**"Não tenho tempo para preencher scorecard toda segunda"**
→ Automatize coleta (crie uma query do banco que extrai números) e deixe só redação para você

**"Operador não quer fazer weekly review"**
→ Ofereça de forma diferente (WhatsApp rápido em vez de call? Chat group?). Só não elimine — é crítico.

**"Caso study fica muito longo"**
→ Corte observações redundantes. Máximo 3–5 minutos de leitura. Se passou, delete o que é menos importante.

**"Cliente quer que eu esconda números"**
→ Use nomes fictícios. Mas NUNCA invente dados. Melhor publicar 2 case studies reais que 10 fictícios.

---

## Próximos passos

Depois de 3–4 pilotos bem-documentados:
- Consolidar aprendizados em docs/lessons-learned.md
- Refinar scorecard baseado em feedback
- Considerar automação de coleta de dados

Depois de 5+ case studies:
- Publicar em website
- Usar em pitch estruturado de prospects
- Apresentar em webinar ou comunidade
