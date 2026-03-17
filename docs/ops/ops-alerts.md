# Alertas Operacionais — Go-Live Lote 1

**Data:** 2026-03-17

---

## Alertas Críticos (ação imediata)

| # | Alerta | Gatilho | Limiar | Canal | Responsável | Ação |
|---|---|---|---|---|---|---|
| A1 | Webhook failure spike | `signature_verification_failed` | > 5 em 15 min | Sentry + monitor manual | Ops Lead | Verificar Twilio token, considerar rollback |
| A2 | Queue failure spike | `queue_worker_job_failed` + `queue_jobs_failed_total` | > 3 em 15 min | Sentry + logs worker | Ops Lead | Investigar payload, pausar worker se necessário |
| A3 | Orchestrator latência alta | `durationMs` no orchestrator > 5000ms | p99 > 5s por 5 min | Logs | Ops Lead | Verificar DB/Redis, considerar rollback |
| A4 | Redis indisponível | `/api/health` → `redis.status: "down"` | 1 ocorrência | Health poll | Ops Lead | Verificar Upstash, se persistir → rollback app |
| A5 | DB indisponível | `/api/internal/health/db` → `ok: false` | 1 ocorrência | Health poll | Ops Lead | Verificar TiDB Cloud, se persistir → rollback |
| A6 | Stripe webhook failures | `webhook_worker_processing_failed` | > 3 em 1h | Sentry | Ops Lead | Verificar Stripe Dashboard, pausar webhook-worker |
| A7 | App health degradado | `/api/health` → HTTP 503 | 2 consecutivos | Health poll | Ops Lead | Rollback imediato via Vercel |

## Alertas de Atenção (investigar em horário útil)

| # | Alerta | Gatilho | Limiar | Observação |
|---|---|---|---|---|
| B1 | Circuit breaker aberto | `/api/internal/health/webhook` → `circuitBreaker: "open"` | 1 ocorrência | Auto-recovery esperado, mas acompanhar |
| B2 | Worker reiniciou | Processo worker parou e reiniciou | > 2 restarts em 1h | Investigar causa (OOM? crash?) |
| B3 | Fila acumulando | Jobs `pending` no queue_jobs crescendo | > 50 jobs pendentes | Verificar throughput do queue-worker |
| B4 | Stripe evento ignorado | `webhook_worker_ignored_event` crescendo | > 20 em 1h | Normal se muitos tipos de evento, mas verificar |

## Protocolo de Escalonamento

```
Alerta A1-A7 (Crítico):
  1. Verificar health endpoints (30s)
  2. Verificar logs do componente afetado (2 min)
  3. Se causa identificada → corrigir env/config
  4. Se causa não identificada em 5 min → rollback parcial
  5. Se 2+ alertas críticos simultâneos → rollback total

Alerta B1-B4 (Atenção):
  1. Registrar no monitoring-48h.md
  2. Investigar na próxima janela de monitoramento
  3. Classificar: problema real / ruído / falso positivo
```
