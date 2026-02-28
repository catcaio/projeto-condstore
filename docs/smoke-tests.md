# Smoke Tests (HTTP)

Smoke test HTTP para validar o pipeline público + cockpit sem Twilio.

## O que valida

1. `GET /api/internal/diag` (token interno)
2. `POST /api/cockpit/attribution/tokens` (sessão admin)
3. `GET /t/{token}` (redirect 302 + `condstore_attr`)
4. `POST /api/events` (ingest público com cookie de atribuição)
5. `GET /api/cockpit/metrics/acquisition` (shape + `X-Metrics-Timezone`)
6. `GET /api/cockpit/ops/status` (`db_ok` / `redis_ok`)

## Variáveis de ambiente

- `BASE_URL` (opcional, default `http://localhost:3000`)
- `INTERNAL_TOKEN` (enviado em `x-internal-token`)
- `COCKPIT_COOKIE` (cookie de sessão admin, ex.: `condstore_session=...`)
- `TENANT_ID` (tenant da sessão admin)

## Como rodar (Windows / PowerShell)

```powershell
$env:BASE_URL = "http://localhost:3000"
$env:INTERNAL_TOKEN = "..."
$env:COCKPIT_COOKIE = "condstore_session=..."
$env:TENANT_ID = "tenant-id-ou-uuid"

.\scripts\smoke\smoke.ps1
```

## Como rodar (Linux/macOS)

```bash
export BASE_URL="http://localhost:3000"
export INTERNAL_TOKEN="..."
export COCKPIT_COOKIE="condstore_session=..."
export TENANT_ID="tenant-id-ou-uuid"

node scripts/smoke/smoke.mjs
```

## Como rodar via GitHub Actions (staging)

Workflow manual: `.github/workflows/smoke.yml` (`workflow_dispatch`)

1. Configurar secrets do repositório (ou ambiente de staging):
   - `BASE_URL`
   - `INTERNAL_TOKEN`
   - `COCKPIT_COOKIE`
   - `TENANT_ID`
2. Abrir a aba **Actions** e executar **Smoke HTTP** manualmente.
3. O workflow roda `node scripts/smoke/smoke.mjs` e falha no primeiro passo que quebrar.

Observações:
- Nenhum valor é hardcoded no workflow; tudo vem de `secrets`.
- O workflow adiciona máscaras explícitas (`::add-mask::`) e o script já mascara tokens/cookies nos logs.

## CI

Workflow de CI: `.github/workflows/ci.yml`

- Executa `npm ci`
- Executa `npm run typecheck`
- Executa `npm test`

## Go/No-Go Hardening (staging/prod)

Smoke rápido focado em hardening: proteção de `/api/internal/*`, seeds bloqueados fora de dev, webhook Twilio sem vazamento, fallback de rate limiter e health básico.

Runbook operacional de rotação: `docs/runbooks/keys-rotation.md`.

### Como rodar (PowerShell)

```powershell
Copy-Item .\tools\smoke\config.example.ps1 .\tools\smoke\config.ps1
# preencher BASE_URL + INTERNAL_TOKEN

.\tools\smoke\smoke.ps1
```

### Como rodar (bash)

```bash
export BASE_URL="https://staging.example.com"
export INTERNAL_TOKEN="..."

./tools/smoke/smoke.sh
```

### Checklist Go/No-Go

1. `/api/internal/health/db` sem token retorna `401`.
2. `/api/internal/health/db` com `x-internal-token` retorna `200` ou `204`.
3. `/api/internal/health/qdrant` sem token retorna `401`.
4. `/api/internal/health/qdrant` com `x-internal-token` retorna `200` ou `204`.
5. `/api/auth/seed-admin` fora de dev retorna `403` ou `404`.
6. `/api/reports/seed` fora de dev retorna `403` ou `404`.
7. `/api/health` retorna `200` e não expõe segredos.
8. Webhook Twilio (se configurado) retorna status não-5xx e não expõe segredos.
9. Se houver detecção de fallback de rate limiter, validar logs/alertas e decidir go/no-go.

### Key Rotation Validation Loop

Use este loop sempre que houver rotação de segredos (Twilio, Stripe, tokens internos ou AI keys):

1. Rodar baseline: `./tools/smoke/smoke.ps1`.
2. Rotacionar segredo no provedor e atualizar no cockpit Security & Keys (ou Vercel env).
3. Executar `test connection` e validação funcional objetiva do fluxo afetado.
4. Rodar novamente: `./tools/smoke/smoke.ps1`.
5. Confirmar `/api/health` e healths internos (`db/redis/qdrant`).
6. Confirmar que DLQ não cresceu e que não houve abertura indevida de circuit breaker.
7. Registrar evidências no ticket e no audit trail operacional.

## Notas

- O script usa `fetch` nativo do Node 18+ (sem dependências extras).
- Logs mascaram tokens/cookies (prefixo + tamanho).
- O passo de métricas (`acquisition`) valida o shape e headers; o bucket `smoke` pode ainda não aparecer imediatamente dependendo do timing/caches.
