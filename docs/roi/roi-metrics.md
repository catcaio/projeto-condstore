# ROI e Prova de Valor — Definição de Métricas

**Propósito:** Catálogo centralizado de todas as métricas que serão rastreadas durante um piloto do CONDSTORE OS. Sem métricas, não há prova de valor.

---

## Métricas de Adoção — Comportamento do operador

Estas métricas medem se o operador está realmente usando o sistema e com que frequência.

| Métrica | Definição | Fonte | Frequência |
|---|---|---|---|
| **Dias de uso por semana** | Quantos dias (0-7) o operador abriu o cockpit e fez pelo menos uma ação | Logs de acesso | Semanal |
| **Conversas abertas** | Total de conversas vindas do WhatsApp que o operador abriu no inbox | Contador em inbox | Semanal (acumulado) |
| **Cotações geradas** | Total de cotações solicitadas via cockpit (clique no botão "Cotar") | Contador em freight_simulations | Semanal (acumulado) |
| **Pedidos criados** | Total de pedidos criados via cockpit (status = CREATED ou superior) | Contador em orders | Semanal (acumulado) |
| **Usuários ativos distintos** | Quantidade de usuários que fizeram login na semana | Logs de autenticação | Semanal |
| **Tempo de primeira resposta** | Tempo médio entre chegada da mensagem e operador abrir a conversa | Logs + metadata | Semanal (média) |

---

## Métricas de Velocidade — Redução de atrito

Estas métricas medem o ganho de velocidade — a promessa principal do produto.

| Métrica | Definição | Medição | Baseline | Meta 30 dias |
|---|---|---|---|---|
| **Tempo médio de cotação** | Tempo decorrido entre solicitar e receber resposta do carrier (em segundos) | Cronômetro na interface + timestamp | 10-15 min | <30 seg |
| **Ferramenta abertas por pedido** | Quantos sistemas diferentes o operador precisa abrir para fechar 1 pedido | Pergunta ao operador "Quantas abas você abre agora?" | 3-4 | 1 |
| **Cotações por dia** | Quantidade de cotações solicitadas em um dia útil | Agregação semanal ÷ 5 | Baseline capturado | Aumento 30%+ |
| **Pedidos criados por dia** | Quantidade de pedidos abertos via cockpit em um dia útil | Agregação semanal ÷ 5 | Baseline capturado | Aumento 20%+ |

---

## Métricas de Volume — Operação

Estas métricas medem o volume efetivo de operação durante o piloto.

| Métrica | Definição | Fonte | Objetivo |
|---|---|---|---|
| **Pedidos criados no período** | Total acumulado de pedidos criados via CONDSTORE OS (4 semanas) | Banco de dados | Meta 48h: ≥2 / Meta 30 dias: ≥15 |
| **Cotações geradas no período** | Total acumulado de cotações solicitadas (4 semanas) | Banco de dados | Meta 48h: ≥3 / Meta 30 dias: ≥20 |
| **Carrier mais usado** | Qual transportadora foi selecionada mais vezes | Análise de orders | Insights para próximos pilotos |
| **CEP mais frequente** | Qual destino apareceu mais (indicador geográfico) | Análise de orders | Insights para configuração |

---

## Métricas de Qualidade e Risco

Estas métricas medem se há problemas bloqueantes ou não.

| Métrica | Definição | Aceitável | Crítico |
|---|---|---|---|
| **Erros críticos** | Falhas de webhook, timeouts de API, pedidos não salvos | 0 por semana | ≥1 erro bloqueante |
| **Tickets de suporte** | Quantas questões o operador/gestor abriu | <3 por semana | ≥5 abertos |
| **Resolução de tickets** | Tempo para fechar cada ticket | <24h | >48h |
| **NPS do operador** | Escala 0-10: "Você recomendaria este sistema para outro operador?" | ≥7 | <5 |
| **Satisfação do gestor** | Qualitativo: está vendo valor? Quer continuar? | Sim + ação | Não / Indeciso |

---

## Métricas de ROI — Conversão em valor financeiro

Estas métricas convertam ganho de tempo em valor monetário.

### Fórmula base de economia

```
Horas economizadas/semana = (Tempo cotação ANTES - Tempo cotação DEPOIS) × Cotações solicitadas ÷ 60

Exemplo:
- Antes: 12 min por cotação
- Depois: 0.5 min por cotação
- Diferença: 11.5 min
- Cotações semana 1: 15
- Horas economizadas = 11.5 × 15 ÷ 60 = 2.875 horas
```

| Métrica | Cálculo | Frequência |
|---|---|---|
| **Horas economizadas/semana** | (Tempo antes − Tempo depois) × Cotações ÷ 60 | Semanal |
| **Economia financeira/semana** | Horas economizadas × Custo/hora do operador | Semanal |
| **Economia financeira/mês** | Economia/semana × 4.3 (média de semanas) | Semanal (projeção) |
| **ROI simples** | Economia 30 dias ÷ Setup fee | Uma vez (final do piloto) |
| **Payback period** | Setup fee ÷ Economia mensal | Uma vez (final do piloto) |

### Exemplo numérico
```
Setup fee: R$ 600
Operador: R$ 50/hora
Semana 1: 15 cotações, economia 2.875h = R$ 143.75
Semana 4: 25 cotações, economia 4.791h = R$ 239.50
Média: 3.5h/semana = R$ 175/semana
Economia 30 dias: R$ 755
ROI: 755 ÷ 600 = 1.26x
Payback: 600 ÷ 175 = 3.4 semanas
```

---

## Métricas qualitativas — Diferenciais

Além de números, observar:

| Aspecto | Pergunta | Indicador positivo |
|---|---|---|
| **Curva de aprendizado** | "Qual foi o tempo até o operador fazer sozinho?" | <2 horas de treinamento |
| **Adesão espontânea** | "O operador usa sem preciso lembrá-lo?" | Sim, todos os dias |
| **Mudança comportamental** | "O operador parou de abrir o site do carrier?" | Sim, usa cockpit 90%+ das vezes |
| **Impacto visibilidade** | "O gestor agora sabe quantos pedidos estão abertos?" | Sim, consulta painel 2x/semana |
| **Pedidos não perdidos** | "Teve algum pedido perdido por demora?" | Não |

---

## Observações importantes

### O que NÃO medir
- ❌ Respostas automáticas de IA (não é feature do MVP)
- ❌ Taxa de conclusão de conversas (conversas podem ser longas, normal)
- ❌ Satisfação com integração de ERP (não existe no MVP)
- ❌ Qualidade de sugestões de resposta (não existe no MVP)

### Arredondamento e aproximação
- Tempos podem ser aproximados (±5 seg)
- Volumes podem ser regressão (não precisa de contagem diária exata)
- Estimativas do cliente sobre antes/depois são aceitáveis

### Documentação
- Cada métrica deve ser capturada no **pilot-scorecard.md** toda segunda
- Comparações devem usar **baseline-capture.md** como referência
- Narrativa de valor vai para **case-study-template.md** ao final
