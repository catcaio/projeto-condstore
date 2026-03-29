# ROI e Prova de Valor — Pacote de Documentacao

Guia oficial para medir, acompanhar e fechar o valor do CONDSTORE OS nos pilotos.

**Objetivo geral:** transformar cada piloto em evidencia objetiva de uso, ganho operacional e decisao clara de continuidade.

---

## Arquivos deste diretorio

### [roi-metrics.md](./roi-metrics.md)

**Quando usar:** Antes de iniciar qualquer piloto

**O que faz:** Define as metricas que serao observadas durante o piloto

**Conteudo:**
- Adocao
- Velocidade
- Volume
- Qualidade
- ROI

**Proxima acao:** Passar para `baseline-capture.md`

---

### [baseline-capture.md](./baseline-capture.md)

**Quando usar:** No primeiro dia, antes de qualquer uso real

**O que faz:** Captura a situacao inicial do cliente para comparacao posterior

**Conteudo:**
- Estrutura atual da operacao
- Processo de cotacao
- Ferramentas usadas hoje
- Dores e expectativa do cliente
- Baseline de numeros

**Proxima acao:** Iniciar `pilot-scorecard.md`

---

### [pilot-scorecard.md](./pilot-scorecard.md)

**Quando usar:** Toda semana durante o piloto

**O que faz:** Consolida adocao, velocidade, risco e calculo de ROI

**Conteudo:**
- Conversas, cotacoes e pedidos
- Tempo de cotacao
- Erros, tickets e satisfacao
- Economia estimada e projecao

**Proxima acao:** Levar os dados para `weekly-review.md`

---

### [pilot-weekly-log-template.md](./pilot-weekly-log-template.md)

**Quando usar:** Depois de cada acompanhamento semanal

**O que faz:** Registra a semana de forma operacional e deixa uma decisao objetiva

**Conteudo:**
- Identificacao do cliente e da semana
- Conversas atendidas, cotacoes concluidas, pedidos criados e acompanhados
- Tempo medio de cotacao e de resposta
- Incidentes ou bloqueios
- Percepcao do operador e do gestor
- Acoes da proxima semana
- Decisao da semana: manter, corrigir, escalar ou encerrar

**Proxima acao:** Arquivar como registro da semana e preparar a semana seguinte

---

### [weekly-review.md](./weekly-review.md)

**Quando usar:** Toda sexta-feira ou ultimo dia util da semana

**O que faz:** Guia a conversa curta de acompanhamento com operador e, quando possivel, gestor

**Conteudo:**
- Checklist pre-call
- Agenda da conversa
- Script por cenario
- Registro pos-call

**Proxima acao:** Preencher `pilot-weekly-log-template.md`

---

### [roi-summary-template.md](./roi-summary-template.md)

**Quando usar:** Na reuniao final de encerramento do piloto

**O que faz:** Consolida baseline, resultados, comparativo antes/depois, ganhos percebidos, limitacoes e recomendacao final

**Conteudo:**
- Problema inicial
- Baseline capturado
- Resultados observados
- Metricas comparativas antes/depois
- Ganhos percebidos
- Limitacoes encontradas
- Recomendacao final
- Blocos finais: pronto para virar case? pronto para proposta comercial?

**Proxima acao:** Se fizer sentido, alimentar `case-study-template.md`

---

### [case-study-template.md](./case-study-template.md)

**Quando usar:** Depois do fechamento do piloto, quando houver material suficiente para virar prova de valor

**O que faz:** Converte resultados validados em um case legivel

**Conteudo:**
- Resumo executivo
- Contexto do cliente
- Problema
- Solucao
- Resultado
- Depoimento
- Timeline
- Licoes

**Proxima acao:** Publicar ou reutilizar como referencia interna

---

## Fluxo de uso completo

```text
[DIA 1]
baseline-capture.md

[SEMANA 1-4]
pilot-scorecard.md
weekly-review.md
pilot-weekly-log-template.md

[ENCERRAMENTO]
roi-summary-template.md

[SE HOUVER MATERIAL]
case-study-template.md
```

---

## Quando usar cada um

1. `baseline-capture.md`
   Use para congelar o "antes" do cliente.

2. `pilot-scorecard.md`
   Use para acompanhar tendencia semanal e calculo de ROI.

3. `weekly-review.md`
   Use para conduzir a conversa semanal com operador e gestor.

4. `pilot-weekly-log-template.md`
   Use para registrar a semana, anotar bloqueios e fechar uma decisao clara.

5. `roi-summary-template.md`
   Use para a reuniao final, com comparacao antes/depois e recomendacao objetiva.

6. `case-study-template.md`
   Use apenas quando o piloto ja tiver resultado suficiente para virar prova de valor.

---

## Coerencia entre os arquivos

- `baseline-capture.md` define o ponto de partida.
- `pilot-scorecard.md` mostra os numeros que evoluem durante o piloto.
- `weekly-review.md` organiza a conversa semanal.
- `pilot-weekly-log-template.md` vira a ata objetiva da semana e registra a decisao.
- `roi-summary-template.md` fecha o piloto para reuniao executiva.
- `case-study-template.md` so entra depois, quando o fechamento ja estiver sustentado pelos dados.

---

## Regras de uso

- Trabalhe com fatos e numeros aproximados quando o cliente nao tiver precisao exata.
- Nao transforme o fechamento do piloto em pitch inflado.
- Nao prometa automacao fora do MVP.
- Se a recomendacao final for `ajustar` ou `encerrar`, registre isso com clareza.

---

## Sequencia recomendada

1. Ler `roi-metrics.md`
2. Preencher `baseline-capture.md`
3. Repetir por semana:
   - `pilot-scorecard.md`
   - `weekly-review.md`
   - `pilot-weekly-log-template.md`
4. Encerrar com `roi-summary-template.md`
5. Se houver base, montar `case-study-template.md`
