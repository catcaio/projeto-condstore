# Data Retention Policy

Padrão (via ENV, com fallback em código):

- `RETENTION_PUBLIC_EVENTS_DAYS=180` (`public_events`)
- `RETENTION_FUNNEL_DAYS=180` (`freight_funnel_events`)
- `RETENTION_FREIGHT_LOGS_DAYS=180` (`freight_simulation_logs`)
- `RETENTION_ATTR_CLICKS_DAYS=365` (`attribution_clicks`)
- `RETENTION_DEDUP_DAYS=30` (`inbound_message_dedup`)

## Tabelas (raw)

- `public_events`: 180 dias
- `attribution_clicks`: 365 dias
- `freight_simulation_logs`: 180 dias
- `freight_funnel_events`: 180 dias
- `inbound_message_dedup`: 30 dias

## Operação

- Rodar `POST /api/internal/jobs/rollup-daily` diariamente (idealmente madrugada UTC) para consolidar `metrics_daily`.
- Rodar `POST /api/internal/jobs/cleanup-retention` em janela de baixo tráfego.
- Para backfill controlado: `POST /api/internal/jobs/rollup-backfill` (máximo 31 dias por request).

## Observações

- Rollups (`metrics_daily`) preservam métricas baratas para cockpit mesmo após cleanup dos dados raw.
- Retenção remove dados operacionais antigos, mas não deve conter PII desnecessária além do já minimizado.
