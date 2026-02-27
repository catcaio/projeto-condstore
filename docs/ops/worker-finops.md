# FinOps Worker — Runbook de Operação

> **Serviço:** `condstore-finops-worker`  
> **Processo:** Redis Streams consumer — processa eventos `FINOPS_*` e `CACHE_INVALIDATE` assincronamente do Next.js app  
> **Stream:** `events:finops` | **DLQ:** `events:finops:dlq` | **Consumer group:** `finops-group`

---

## Opção A — systemd (preferencial em VPS)

### 1. Instalar o unit file

```bash
# No VPS — como root ou sudo
sudo cp infra/systemd/condstore-finops-worker.service \
        /etc/systemd/system/condstore-finops-worker.service

# Editar se necessário (WorkingDirectory, User, EnvironmentFile)
sudo nano /etc/systemd/system/condstore-finops-worker.service
```

### 2. Habilitar + iniciar

```bash
sudo systemctl daemon-reload
sudo systemctl enable condstore-finops-worker   # auto-start no boot
sudo systemctl start  condstore-finops-worker
sudo systemctl status condstore-finops-worker
```

### 3. Comandos do dia-a-dia

| Ação | Comando |
|------|---------|
| Ver logs ao vivo | `journalctl -u condstore-finops-worker -f` |
| Logs das últimas 2h | `journalctl -u condstore-finops-worker --since "2h ago"` |
| Reiniciar | `sudo systemctl restart condstore-finops-worker` |
| Parar (graceful) | `sudo systemctl stop condstore-finops-worker` |
| Recarregar unit file | `sudo systemctl daemon-reload && sudo systemctl restart condstore-finops-worker` |

### 4. Deploy (atualizar código)

```bash
# No VPS
cd /var/www/condstore
git pull origin main
npm ci --omit dev
sudo systemctl restart condstore-finops-worker
journalctl -u condstore-finops-worker -f --lines=30
```

### 5. Verificar saúde

```bash
# Processo vivo?
sudo systemctl is-active condstore-finops-worker

# Métricas de backlog (requer INTERNAL_EXPORT_TOKEN):
curl -s -H "x-internal-token: $INTERNAL_EXPORT_TOKEN" \
  http://localhost:3015/api/internal/events/metrics | jq .
```

---

## Opção B — Docker

### Build + subir

```bash
# A partir da raiz do repositório
docker compose -f infra/docker/docker-compose.worker.yml up -d --build

# Ver logs
docker logs -f condstore-finops-worker
```

### Comandos do dia-a-dia

| Ação | Comando |
|------|---------|
| Status | `docker compose -f infra/docker/docker-compose.worker.yml ps` |
| Reiniciar | `docker compose -f infra/docker/docker-compose.worker.yml restart finops-worker` |
| Parar | `docker compose -f infra/docker/docker-compose.worker.yml stop finops-worker` |
| Logs ao vivo | `docker logs -f condstore-finops-worker` |

---

## Graceful Shutdown

O worker trata `SIGTERM` e `SIGINT`:

1. Seta flag `shuttingDown = true` — loop de consumo para de aceitar novos eventos
2. Aguarda até **8 s** para eventos em processamento terminarem
3. Chama `redis.quit()` — fecha conexão de forma limpa
4. Sai com código 0

O systemd envia `SIGTERM` e aguarda `TimeoutStopSec=15` antes de SIGKILL — tempo suficiente para o drain completo.

---

## Observabilidade de Backlog e DLQ

### Endpoint de métricas

```bash
# Substitua $TOKEN pelo INTERNAL_EXPORT_TOKEN ou INTERNAL_DIAG_TOKEN
curl -s \
  -H "x-internal-token: $TOKEN" \
  "https://seu-dominio.com/api/internal/events/metrics?stream=events:finops&group=finops-group" \
  | jq .
```

**Resposta exemplo:**
```json
{
  "stream": "events:finops",
  "group": "finops-group",
  "lag": {
    "pending": 0,
    "streamLength": 42,
    "undelivered": 0,
    "oldestPendingId": null,
    "consumerCount": 1,
    "collectedAt": "2026-02-27T13:00:00Z"
  },
  "dlq": {
    "dlqStream": "events:finops:dlq",
    "dlqCount": 2,
    "collectedAt": "2026-02-27T13:00:00Z"
  }
}
```

### Alertas recomendados

| Métrica | Threshold | Ação |
|---------|-----------|------|
| `lag.pending > 50` | Aviso | Worker pode estar travado — reiniciar |
| `lag.pending > 200` | Crítico | Investigar; escalar consumidores |
| `dlq.dlqCount > 0` | Aviso | Ver DLQ: `GET /api/internal/events/dlq?stream=events:finops` |

---

## DLQ — Dead Letter Queue

Eventos que falharam 5× consecutivos são movidos para `events:finops:dlq`.

```bash
# Ver DLQ via API
curl -s \
  -H "x-internal-token: $TOKEN" \
  "https://seu-dominio.com/api/internal/events/dlq?stream=events:finops" \
  | jq .

# Ver DLQ diretamente no Redis
redis-cli XLEN events:finops:dlq
redis-cli XRANGE events:finops:dlq - + COUNT 10
```

### Replay manual (quando causa identificada)

```bash
# Não há suporte automático a replay — processo manual:
# 1. Copiar o payload da DLQ
# 2. Corrigir a causa raiz
# 3. Re-publicar via XADD no stream principal:
redis-cli XADD events:finops '*' payload '<json-do-payload>'
```

---

## Subir no VPS em 6 linhas (systemd)

```bash
sudo cp infra/systemd/condstore-finops-worker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable condstore-finops-worker
sudo systemctl start condstore-finops-worker
sudo systemctl status condstore-finops-worker
journalctl -u condstore-finops-worker -f
```

---

## Variáveis de Ambiente Necessárias

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `REDIS_URL` | Sim | `redis://host:6379` ou com auth |
| `DATABASE_URL` | Sim | MySQL connection string |
| `AUTH_SECRET` | Sim | JWT secret |
| `SEED_TOKEN` | Sim | Token de seed |
| `PROVIDER_SECRETS_KEY` | Prod | 64-char hex para AES-256-GCM |
| `NODE_ENV` | Recomendado | `production` |
