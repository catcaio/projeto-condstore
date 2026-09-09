# FRK-9 — State Machine, CAS e Audit Trail

> Documento de delimitação formal da camada de estado e auditoria do Frank introduzida na PR #385.

## 1. Boundary de responsabilidade (P1)

| Ação | Responsável | Arquivo / API |
|------|-------------|---------------|
| Criar `Run` e `Step` | `FrankExecutionStateService` | `src/modules/frank/frank-execution-state.service.ts` (main) |
| Avançar status com CAS | `FrankExecutionCasService.transitionRun` / `transitionStep` | `src/modules/frank/frank-execution-cas.ts` |
| Registrar auditoria de turno | `recordTurn` (append-only em `frank_execution_turns`) | `src/modules/frank/frank-execution-cas.ts` |
| Ler auditoria de turnos | `listTurns` (tenant-scoped, ordenado por `turn` asc) | `src/modules/frank/frank-execution-cas.ts` |
| Retomar após restart | `recoverActiveExecutions` (service do main) + reads via CAS | `src/modules/frank/frank-execution-state.service.ts` |

A transição CAS é condicional ao `version` observado pelo chamador: o `UPDATE` só persiste se a linha ainda possuir a versão esperada; caso contrário, a store lança `VersionConflictError`.

### Limite declarado

O agent-loop legado **não passa por esta camada nesta PR**. A integração das decisões do loop nas transições CAS (por exemplo, fazer com que uma aprovação humana dispare `transitionRun`/`transitionStep`) é uma demanda posterior já delimitada. A interface `ExecutionCasStore` está preparada para essa evolução, mas a PR #385 a mantém como contrato de storage, não como rewrite do runtime.

## 2. Semântica de `FAILED` / retry (P5)

`FAILED` **nunca é terminal** para um `Run`. O service do main permite as transições `FAILED -> RUNNING` e `FAILED -> CANCELLED`. O retry é, portanto, um novo avanço via CAS a partir do estado atual observado; a camada CAS não realiza auto-retry.

Para `Step`, um estado `FAILED` pode retornar a `RUNNING` via re-tentativa ou transitar para `COMPLETED`/`SKIPPED` após aprovação humana, conforme orquestração do main.

A tabela de transições permitidas pelo main é:

```text
PENDING              -> RUNNING, PAUSED_HUMAN_APPROVAL, COMPLETED, CANCELLED, FAILED
RUNNING              -> PAUSED_HUMAN_APPROVAL, COMPLETED, FAILED, CANCELLED
PAUSED_HUMAN_APPROVAL -> RUNNING, CANCELLED, FAILED
COMPLETED            -> (terminal)
FAILED               -> RUNNING, CANCELLED
CANCELLED            -> (terminal)
```

A camada CAS **não introduz estados terminais próprios** nem **auto-retry**. O retry é decisão do orquestrador (main), que observa o estado, toma a decisão e chama `transitionRun`/`transitionStep` com a versão esperada.

## 3. Nível de garantia de imutabilidade (P7)

A tabela `frank_execution_turns` é **append-only por convenção de API**: nenhum `UPDATE` ou `DELETE` sobre ela é exposto por este módulo. A restrição `UNIQUE(run_id, turn)` impede duplicatas no storage e detecta condições de corrida quando dois workers tentam registrar o mesmo turno simultaneamente.

Não há hash chain nem assinatura. A garantia desta PR é **"histórico não reescrito pela API e sem duplicatas/regressões"**, não **"trail criptograficamente inviolável"**. A integridade contra acesso direto ao banco depende das permissões do banco e dos audit logs de infraestrutura, não deste código.
