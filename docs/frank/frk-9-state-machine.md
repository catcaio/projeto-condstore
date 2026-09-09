# FRK-9 — Execution State Machine (Run / Step)

Dependência: Execution Runtime. Critério: máquina documentada, persistida e
coberta por testes de transição.

## 1. Boundary de responsabilidade (review ponto 1)

Uma única autoridade — `execution-runtime.ts` (`ExecutionRuntime`). Cada
responsabilidade tem exatamente um dono:

| Responsabilidade | Dono | Observação |
|---|---|---|
| Criar Run / Step | `createRun` / `createStep` | Único caminho de abertura |
| Abrir / fechar Turn | `openTurn` / `closeTurn` | Turn calculado (`nextTurn`), nunca aceito |
| Avançar status | `advanceRun` / `advanceStep` | Sempre com versão observada (CAS) |
| Retry | `retryStep` | Único caminho; respeita o budget do Run |
| Persistir estado | `ExecutionStore` (memória ou Drizzle) | Separado da máquina pura |
| Registrar auditoria | `closeTurn` → `saveTurn` (append-only) | Histórico nunca reescrito |
| Retomar após restart | `resumeRun` | Reconstrói a partir das linhas persistidas, sem mutar |
| Concorrência | versão CAS em cada avanço | Perdedor recebe `VersionConflictError` |

Limite declarado: o agent-loop legado não passa por este boundary nesta PR.
A integração (plug das decisões do loop em `openTurn`/`closeTurn`) é uma
demanda separada já delimitada; o contrato está preparado para ela.

## 2. Estados e transições válidas

### Run

| De | Para |
|---|---|
| CREATED | RUNNING, CANCELLED |
| RUNNING | PAUSED, SUCCEEDED, FAILED, CANCELLED |
| PAUSED | RUNNING, FAILED, CANCELLED |
| SUCCEEDED / FAILED / CANCELLED | *(terminal — nenhuma saída)* |

FAILED é terminal no Run porque Run nunca faz auto-retry: reexecutar
significa abrir um novo Run pelo boundary.

### Step

| De | Para |
|---|---|
| PENDING | RUNNING, SKIPPED, CANCELLED |
| RUNNING | SUCCEEDED, FAILED, SKIPPED, CANCELLED |
| FAILED | RETRYING, CANCELLED *(quiescente: estável salvo retry explícito)* |
| RETRYING | RUNNING, FAILED, CANCELLED |
| SUCCEEDED / SKIPPED / CANCELLED | *(terminal — nenhuma saída)* |

`attempt` é 1-based, inteiro, nunca diminui. `FAILED → RETRYING` exige
`attempt < maxAttempts` do Run; estouro gera `RetryBudgetExhaustedError`.

## 3. Persistência: estado operacional × log de eventos (review ponto 2)

- `frank_runs` / `frank_steps`: estado operacional corrente (status, attempt,
  `version` para CAS). Migration `0005_frank_execution.sql`.
- `frank_turns`: append-only, `UNIQUE(run_id, turn)`, ordenação determinística
  por `turn`. Turn duplicado ou em regressão é rejeitado (`DuplicateTurnError`
  / `TurnRegressionError`).
- Toda leitura e escrita é tenant-scoped (`listTurns({ tenantId, runId })`;
  acesso cruzado falha fechado com `TenantMismatchError`).

## 4. Níveis de garantia (review ponto 7, com precisão)

- Objetos em memória: funcionalmente imutáveis (builders retornam novos).
- Histórico persistido: append-only + chave única + CAS de versão.
- NÃO há hash chain: esta PR não declara trilha inviolável.

## 5. Validação no boundary (review ponto 8)

`saveTurn` reconstrói o envelope pelo builder canônico (rejeita envelope
artesanal), confere tenant do Run/Step, existência do Step no Run,
unicidade e monotonicidade do turn.

## 6. Testes (review ponto 9)

Propriedades cobertas em memória + suite Drizzle real sob
`TEST_DATABASE_URL` (pula — sem fingir — quando ausente).
