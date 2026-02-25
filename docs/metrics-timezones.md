# Metrics Timezones (Tenant-aware)

## Definição de "dia"

- O `dia` das métricas agora é o dia local do tenant (`tenants.timezone`), e não mais o dia UTC.
- A chave `metrics_daily.day_date` representa `YYYY-MM-DD` no timezone do tenant.
- Nas rotas de métricas (`/api/cockpit/metrics/acquisition`), a janela `7d`/`30d` é alinhada à meia-noite local do tenant.
- O intervalo usado é `[startUTC, endUTC)`, onde `endUTC` é a meia-noite do dia local atual (logo, o dia atual parcial fica fora da janela).

## Impacto em rollup e backfill

- `runDailyMetricsRollup` agora processa por tenant (loop em `tenants`).
- Para cada tenant:
  - lê `timezone`;
  - calcula bounds UTC a partir do dia local alvo;
  - agrega eventos raw no intervalo UTC correspondente;
  - grava em `metrics_daily.day_date` o dia local (string `YYYY-MM-DD`).
- `runRollupBackfill` reaproveita a mesma lógica, iterando pelos dias locais informados em `from`/`to`.
- Logs do rollup incluem `tenantId` e `timezone` para facilitar diagnóstico de divergência de janelas.

## Como alterar o timezone do tenant

Endpoint:

- `PUT /api/tenants/[tenantId]/settings`

Regras:

- Requer sessão válida do tenant.
- `admin` only.
- Valida timezone IANA (ex.: `America/Sao_Paulo`, `America/New_York`, `Europe/Lisbon`).

Body:

```json
{
  "timezone": "America/Sao_Paulo"
}
```

Resposta (200):

```json
{
  "tenantId": "tenant-1",
  "timezone": "America/Sao_Paulo",
  "updated": true
}
```

## Observabilidade / cache

- A rota de acquisition retorna header `X-Metrics-Timezone`.
- A cache key inclui `tz=...` para evitar colisão entre tenants/timezones diferentes.

