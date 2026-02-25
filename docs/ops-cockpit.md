# Ops Cockpit

## Endpoints

- `GET /api/cockpit/ops/status` (admin-only)
- `POST /api/cockpit/ops/run-rollup` (admin-only)

## Campos do status (`GET /api/cockpit/ops/status`)

- `timezone`: timezone atual do tenant (IANA), usado para janelas e rollup diário.
- `db_ok`: resultado do health-check de banco (`SELECT 1`).
- `redis_ok`: resultado do `PING` no Redis (ou fallback local).
- `rollup_status`:
  - `last_day_processed`: último dia local (`YYYY-MM-DD`) processado para o tenant.
  - `last_run_at`: horário da última execução registrada.
  - `last_duration_ms`: duração da última execução do rollup para o tenant.
  - `last_rows_written`: quantidade de linhas gravadas em `metrics_daily` na última execução.
  - `status`: `ok` ou `error`.
  - `last_error_code`: código/erro resumido da última falha.

## Controle manual de rollup

`POST /api/cockpit/ops/run-rollup`

Body opcional:

```json
{
  "day": "2026-02-24"
}
```

- Se `day` não for enviado, usa a regra padrão do serviço (`defaultRollupDay`).
- A execução é limitada ao tenant da sessão admin.
- A rota grava audit log (`ops.run_rollup`) e invalida o cache curto de status.
- O `result` pode incluir:
  - `failedTenants`: quantidade de tenants com erro no processamento (sempre `0` na rota manual, exceto falha retornada pelo serviço antes da resposta).
  - `errors`: lista resumida (`tenantId`, `day`, `code`, `message`) usada em execuções multi-tenant (jobs internos).
- O processamento multi-tenant usa paralelismo controlado por `METRICS_ROLLUP_CONCURRENCY` (default `4`) e mantém lock distribuído por `tenant + day`.

### Resposta `409 LOCK_BUSY`

- Retornada quando já existe outra execução de rollup em andamento para o mesmo `tenant + day`.
- A resposta inclui `x-request-id` e pode incluir `Retry-After: 60`.
- Isso evita concorrência entre botão manual e job automático/backfill para o mesmo dia.

## Playbook de recuperação (rollup)

1. Verificar `GET /api/cockpit/ops/status`:
   - `db_ok` / `redis_ok`
   - `rollup_status.status`
   - `last_error_code`
2. Corrigir causa raiz (ex.: tabela ausente, erro de conexão, migration pendente).
3. Rodar `POST /api/cockpit/ops/run-rollup` para um dia específico.
4. Validar novamente `ops/status` e comparar com `/api/cockpit/metrics/acquisition`.
5. Se houver período maior afetado, rodar backfill.

## Backfill com segurança

- Endpoint interno: `POST /api/internal/jobs/rollup-backfill`
- Limite atual: até 31 dias por requisição.
- Recomendações:
  - Rodar em blocos menores (ex.: 7 dias) em produção.
  - Evitar concorrência com janelas automáticas críticas (ex.: horário do job diário).
  - Se receber `409 LOCK_BUSY`, aguarde e tente novamente (não spammar o botão).
  - Monitorar `metrics_rollup_status` por tenant após cada bloco.
  - Confirmar coerência com métricas raw em amostra pequena.
