# Tracking Attribution

## Visão geral

Fluxo implementado:

1. Clique de campanha acessa `GET /t/{token}` com `utm_*` e `gclid/fbclid/msclkid`.
2. O backend grava/atualiza `attribution_clicks` (sem armazenar IP/UA em plaintext; apenas hashes SHA-256).
3. O backend redireciona (302) para URL configurada e persiste cookie `condstore_attr` com o token.
4. Eventos em `POST /api/events` propagam `utm_*`, `ref_token` e `click_id` para `public_events`.
5. Se o token chegar no inbound WhatsApp (`#t=...`, `t=...`, `token:...`), ele é consumido e salvo em `session.attribution`.
6. Eventos de funil e logs de simulação de frete passam a persistir `utm_*`, `ref_token`, `click_id`.

## Como gerar token

Use um token opaco, curto e não sequencial (ex.: UUID curto/base62).

Exemplos válidos:

- `ref_abc123`
- `camp-2026-02`
- `A1b2C3_d4`

Regex aceito: `^[A-Za-z0-9_-]{3,128}$`

## Como usar links de anúncio

### Redirect para landing (modo `landing`)

Config:

- `TRACKING_REDIRECT_URL=https://seusite.com/landing`
- `TRACKING_REDIRECT_MODE=landing`

Exemplo:

```txt
https://seu-dominio.com/t/ref_abc123?utm_source=google&utm_medium=cpc&utm_campaign=frete_fev&utm_content=cta1&gclid=TEST-GCLID&landing_url=https%3A%2F%2Fseusite.com%2Flanding
```

### Redirect para WhatsApp deep link (modo `whatsapp`)

Config:

- `TRACKING_REDIRECT_URL=https://wa.me/5511999999999`
- `TRACKING_REDIRECT_MODE=whatsapp`

O backend anexa `text=#t=<token>` ao redirect automaticamente.

## Como validar no cockpit

Use os endpoints de métricas com `groupBy`:

- `/api/cockpit/metrics?groupBy=utm_source`
- `/api/cockpit/metrics?groupBy=utm_campaign`
- `/api/cockpit/metrics/funnel?groupBy=utm_source`
- `/api/cockpit/metrics/freight?groupBy=utm_campaign`

Resposta inclui `attribution_breakdown_7d` com buckets (top 10 + `(none)`).
