# FRK-9 — Execution State Machine (Run / Step)

Dependência: Execution Runtime. Critério: máquina de estados documentada,
persistida e coberta por testes de transição.

## 1. Onde Run/Step viviam antes

- `src/modules/frank/agent-loop.ts` — stateless: `decideNextAction` +
  `evaluatePolicy` + `runFrankAgentTool` retornam `ToolResult` efêmero
  (`BLOCKED_BY_POLICY` / `EXECUTED` / `FAILED`). Nenhum registro de Run.
- `src/modules/frank/session.repository.ts` (`frank_session_state`) —
  `currentIntent` / `currentStep` são strings livres, sem transições válidas.
- `src/modules/frank/tools/tool-runner.ts` + `tool-policy.ts` — gate por
  chamada de tool, sem ciclo de vida.
- `src/modules/frank/workers/frank-worker.ts` — poll de `incoming_messages`,
  sem registro de execução.
- `src/core/conversation/state-machine.ts` — estados de *diálogo*
  (`IDLE` / `AWAITING_CEP` / …), não de execução. Não confundir.

## 2. Estados e transições válidas

### Run

| De | Para |
|---|---|
| CREATED | RUNNING, CANCELLED |
| RUNNING | PAUSED, SUCCEEDED, FAILED, CANCELLED |
| PAUSED | RUNNING, FAILED, CANCELLED |
| SUCCEEDED / FAILED / CANCELLED | *(terminal — nenhuma saída)* |

### Step

| De | Para |
|---|---|
| PENDING | RUNNING, SKIPPED, CANCELLED |
| RUNNING | SUCCEEDED, FAILED, SKIPPED, CANCELLED |
| FAILED | RETRYING, CANCELLED |
| RETRYING | RUNNING, FAILED, CANCELLED |
| SUCCEEDED / SKIPPED / CANCELLED | *(terminal — nenhuma saída)* |

Qualquer par fora dessas tabelas lança `InvalidTransitionError`
(`invalid_run_transition` / `invalid_step_transition`). Entrar em `RETRYING`
incrementa `attempt`.

## 3. Execution Turn Envelope

```
input → contexto resolvido → decisão → policy → ação → resultado → trilha auditável
```

`buildTurnEnvelope({ runId, stepId, tenantId, requestId, turn, input,
resolvedContext, decision, policy, action, result })` impõe invariantes
determinísticos:

- ids obrigatórios; `turn >= 1`;
- `result.ok` não pode ser `true` com `policy.allowed === false`;
- `result.status` não pode ser `EXECUTED` com policy bloqueada.

`appendAuditEvent` estende a trilha de forma imutável.

## 4. Persistência

- `InMemoryExecutionStore` — usada em testes e como fallback.
- `DrizzleFrankEventsExecutionStore` — persiste o envelope na tabela
  existente `frank_events` com `kind = 'frank.execution.turn'`
  (`sessionId = runId`, `correlationId = requestId`). Sem migration nova.
- Pendente (requer migration + DB): tabela dedicada
  `frank_execution_runs` / `frank_execution_steps` com lock otimista por
  `version`. Não implementada nesta branch.

## 5. Testes

`src/modules/frank/execution/__tests__/execution-state-machine.test.ts`:
9 transições válidas de Run, 10 inválidas, 12 válidas de Step,
12 inválidas, bump de `attempt`, invariantes do envelope, imutabilidade da
trilha e persistência in-memory por run.
