# Ora Brasiliae — Results section (MPV-51)

## Objetivo

Estruturar a seção de resultados do paper com foco em quatro blocos obrigatórios:

1. **N vs N²**
2. **N\***
3. **Robustez**
4. **Janela**

A seção deve ser reprodutível, auditável e vinculada aos artefatos gerados pelo pipeline de execução.

---

## Estrutura recomendada da seção

## 1) N vs N²

### Pergunta
Como o comportamento observado escala em cenários lineares (`N`) versus quadráticos (`N²`)?

### Conteúdo mínimo
- Definição objetiva dos dois regimes comparados (`N` e `N²`).
- Curvas/tabelas com:
  - tamanho de entrada;
  - tempo total;
  - custo por operação;
  - taxa de sucesso.
- Ponto de inflexão onde a diferença se torna operacionalmente relevante.

### Saída esperada
- Figura comparativa única (`N` vs `N²`) com mesma escala e mesma janela temporal.
- Tabela-resumo com médias, desvio padrão e delta percentual.

### Evidência auditável
- Dataset de entrada versionado.
- Comando de execução utilizado.
- Hash/checksum dos artefatos exportados.

---

## 2) N*

### Pergunta
Qual é o `N*` (limiar operacional) em que o comportamento muda de aceitável para crítico?

### Conteúdo mínimo
- Definição formal do critério de `N*` (ex.: latência, custo, erro, throughput).
- Método de estimação de `N*` (regra determinística ou ajuste estatístico).
- Intervalo de confiança ou faixa de estabilidade do `N*`.

### Saída esperada
- Valor de `N*` por cenário.
- Gráfico com anotação explícita do ponto `N*`.
- Tabela com sensibilidade de `N*` por parâmetro.

### Evidência auditável
- Critério de cálculo em texto + pseudocódigo.
- Logs de execução contendo parâmetros e seed.
- Export do cálculo bruto (CSV/JSON).

---

## 3) Robustez

### Pergunta
Os resultados se mantêm sob variações plausíveis de dados e parâmetros?

### Conteúdo mínimo
- Análise de sensibilidade (variação controlada de parâmetros).
- Repetições com seeds diferentes.
- Testes de estabilidade em cenários adversos e bordas.

### Saída esperada
- Faixas (mín/máx/p50/p95) por métrica.
- Heatmap ou matriz de estabilidade por variação.
- Lista explícita de casos onde o método degrada.

### Evidência auditável
- Matriz de experimentos executada.
- Registro das seeds e versões de ambiente.
- Log consolidado com falhas e retries, quando houver.

---

## 4) Janela

### Pergunta
Como os resultados variam quando observados em diferentes janelas (temporal, amostral ou operacional)?

### Conteúdo mínimo
- Definição das janelas comparadas (ex.: curta, média, longa).
- Critério de segmentação das janelas.
- Comparativo entre janelas com o mesmo protocolo de medição.

### Saída esperada
- Gráfico temporal com recortes por janela.
- Tabela com métricas agregadas por janela.
- Conclusão objetiva: qual janela melhor representa o comportamento real.

### Evidência auditável
- Metadados de início/fim de cada janela.
- Relatório de cobertura por janela (quantidade de amostras válidas).
- Registro de exclusões e limpeza de dados.

---

## Checklist de fechamento (obrigatório)

- [ ] Cada bloco (`N vs N²`, `N*`, `Robustez`, `Janela`) tem pelo menos 1 figura e 1 tabela.
- [ ] Todos os resultados possuem comando reprodutível documentado.
- [ ] Os artefatos exportados têm checksum/hash registrado.
- [ ] Seeds, parâmetros e versão de ambiente foram capturados.
- [ ] Limitações e ameaças à validade foram declaradas.

## Template curto para conclusão da seção

> Os resultados mostram diferença consistente entre regimes `N` e `N²`, com ponto crítico em `N* = <valor>` no cenário base.
> A análise de robustez indica estabilidade em `<faixa>%` das variações testadas.
> Na análise por janela, `<janela>` apresentou maior aderência ao comportamento operacional real.

