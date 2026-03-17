# Dashboard Operacional — Condstore OS

**Data:** 2026-03-17

---

## Health Endpoints (polling contínuo)

| Endpoint | Auth | O que mede | Alerta se |
|---|---|---|---|
| `GET /api/health` | público | app + env + redis | `ok: false` ou `redis.status: "down"` |
| `GET /api/internal/health/db` | internal token | DB (SELECT 1) + latência | `ok: false` ou `latencyMs > 2000` |
| `GET /api/internal/health/redis` | internal token | Redis PING + latência | `ok: false` e `configured: true` |
| `GET /api/internal/health/webhook` | internal token | Twilio sig + Redis + DB + Circuit Breaker | `healthy: false` ou `circuitBreaker: "open"` |

### Como acessar

```bash
# Público
curl https://app.condstoreos.com/api/health

# Interno (requer SEED_TOKEN)
curl -H "x-internal-token: $SEED_TOKEN" https://app.condstoreos.com/api/internal/health/db
curl -H "x-internal-token: $SEED_TOKEN" https://app.condstoreos.com/api/internal/health/redis
curl -H "x-internal-token: $SEED_TOKEN" https://app.condstoreos.com/api/internal/health/webhook
```

---

## Métricas via Logs Estruturados

Todos os logs são JSON (`logger.ts`), com campos `timestamp`, `level`, `message`, `context`.

### Métricas-Chave (buscar por `message`)

| Indicador | Log message | Tipo | Origem |
|---|---|---|---|
| Webhook recebido | `whatsapp_inbound_*` | INFO | orchestrator |
| Assinatura inválida | `signature_verification_failed` | ERROR | webhook route |
| Erro inbound | `inbound_orchestrator_error` | ERROR | orchestrator |
| Job processado | `queue_worker_job_completed` | INFO | queue-worker |
| Job falhou | `queue_worker_job_failed` | ERROR | queue-worker |
| FinOps processado | `queue_jobs_processed_total` | INFO | finops-worker |
| FinOps falhou | `queue_jobs_failed_total` | ERROR | finops-worker |
| Cotação falhou | `quote_worker_failed` | ERROR | quote-worker |
| Stripe falhou | `webhook_worker_processing_failed` | ERROR | webhook-worker |
| Stripe ignorado | `webhook_worker_ignored_event` | INFO | webhook-worker |
| Circuit breaker abriu | via health endpoint | — | circuit-breaker |

### Como consultar (Vercel Logs)

```bash
# Via Vercel CLI
npx vercel logs --output raw --since 1h | grep -c "queue_worker_job_failed"
npx vercel logs --output raw --since 1h | grep -c "signature_verification_failed"
npx vercel logs --output raw --since 1h | grep -c "quote_worker_failed"
```

### Como consultar (Workers locais)

```powershell
# Contar erros no log do finops worker
Select-String -Path c:\tmp\worker-finops.log -Pattern "queue_jobs_failed_total" | Measure-Object
# Contar erros de cotação
Select-String -Path c:\tmp\quote-worker.log -Pattern "quote_worker_failed" | Measure-Object
```

---

## Sentry (Observabilidade de erros)

O `logger.error()` automaticamente envia para Sentry via `captureExceptionWithSentryNonBlocking()`.

Monitorar no Sentry Dashboard:
- **Issues** com tag `logger: app`
- **Breadcrumbs** com `requestId` e `tenantId`
- **Error rate** no painel principal

---

## Visão de Processos (Workers)

| Worker | Comando | Log |
|---|---|---|
| finops-worker | `node --env-file=.env --import tsx src/workers/finops-worker.ts` | stdout/stderr |
| quote-worker | `node --env-file=.env --import tsx src/workers/quote-worker.ts` | stdout/stderr |
| queue-worker | `node --env-file=.env --import tsx src/workers/queue-worker.ts` | stdout/stderr |
| DOMINE processor | `node --env-file=.env --import tsx scripts/start-domine-processor.ts` | stdout/stderr |

### Health do Worker

Worker vivo = processo rodando. Verificar:
```powershell
Get-Process -Name "node" | Where-Object { $_.CommandLine -like "*worker*" }
```
