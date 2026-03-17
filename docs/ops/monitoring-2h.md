# Monitoramento Primeiras 2 Horas — Go-Live Lote 1

**Data do Go-Live:** ____-__-__
**Horário de início:** __:__
**Commit/Release:** ________________
**Responsável:** ________________

---

## Janela: T+0 → T+15min

| Indicador | Valor | Status |
|---|---|---|
| `/api/health` ok | | ⬜ |
| `/api/internal/health/db` ok | | ⬜ |
| `/api/internal/health/redis` ok | | ⬜ |
| `/api/internal/health/webhook` healthy | | ⬜ |
| Webhooks recebidos (count) | | |
| Assinaturas inválidas (count) | | |
| Erros orchestrator (count) | | |
| Workers rodando (list) | | |
| Fila pendente (count) | | |
| Erros Stripe (count) | | |

**Observações:** _____________________________

**Decisão:** ⬜ Continuar | ⬜ Investigar | ⬜ Rollback parcial | ⬜ Rollback total

---

## Janela: T+15 → T+30min

| Indicador | Valor | Status |
|---|---|---|
| `/api/health` ok | | ⬜ |
| `/api/internal/health/db` latencyMs | | |
| `/api/internal/health/redis` latencyMs | | |
| Circuit breaker state | | |
| Webhooks recebidos (delta 15min) | | |
| Jobs processados (delta) | | |
| Jobs falharam (delta) | | |
| Cotações processadas (delta) | | |
| Cotações timeout (delta) | | |
| Sentry: novos issues? | | |

**Observações:** _____________________________

**Decisão:** ⬜ Continuar | ⬜ Investigar | ⬜ Rollback parcial | ⬜ Rollback total

---

## Janela: T+30 → T+60min

| Indicador | Valor | Status |
|---|---|---|
| `/api/health` ok | | ⬜ |
| Health webhook completo | | ⬜ |
| Webhooks total (1h) | | |
| Taxa de erro assinatura (%) | | |
| Taxa de erro queue (%) | | |
| Latência orchestrator p99 | | |
| Workers: restarts? | | |
| Fila: acumulando? | | |
| Stripe: pagamentos ok? | | |
| Sentry: error rate | | |

**Observações:** _____________________________

**Decisão:** ⬜ Continuar | ⬜ Investigar | ⬜ Rollback parcial | ⬜ Rollback total

---

## Janela: T+60 → T+120min

| Indicador | Valor | Status |
|---|---|---|
| Health status geral | | ⬜ |
| Volume total processado (2h) | | |
| Total erros (2h) | | |
| Taxa de erro geral (%) | | |
| Fila estável (sim/não) | | |
| Latência média orchestrator | | |
| Workers estáveis (sim/não) | | |
| Redis latência estável | | |
| DB latência estável | | |
| Incidentes abertos | | |

**Observações:** _____________________________

**Decisão T+2h:**
- ⬜ **VERDE** — Estável, continuar monitoramento 24h
- ⬜ **AMARELO** — Instável, manter tráfego atual, investigar
- ⬜ **VERMELHO** — Incidente crítico, acionar rollback

---

## Resumo das 2h

| Métrica | Valor |
|---|---|
| Volume total webhooks | |
| Volume total jobs processados | |
| Total erros | |
| Taxa de erro (%) | |
| Pior latência observada | |
| Incidentes | |
| Rollbacks acionados | |
| Status final | |
