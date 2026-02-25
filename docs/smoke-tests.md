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

## Notas

- O script usa `fetch` nativo do Node 18+ (sem dependências extras).
- Logs mascaram tokens/cookies (prefixo + tamanho).
- O passo de métricas (`acquisition`) valida o shape e headers; o bucket `smoke` pode ainda não aparecer imediatamente dependendo do timing/caches.
