# FinOps Worker e Infraestrutura de Eventos (Event Bus)

A aplicação transicionou de side-effects "fire-and-forget" de banco/cache diretamente bloqueando o event-loop da API, para um modelo de processamento resiliente via enfileiramento (Event Bus) utilizando Redis Streams. 

## Por que Redis Streams em vez de Bull/SQS?
- A aplicação já tem `ioredis` como dependência fundamental e conexão principal via `process.env.REDIS_URL`. Redis Streams (`XADD`, `XREADGROUP`) garante uma fila com Consumer Groups embutidos, entrega *At-Least-Once*, Acknowledge (`XACK`), e capacidade de rebobinamento. É mais rápido que SQS e dispensa os payloads gigantes em RAM do BullMQ com stack muito menor de libs.

## Tipos de Eventos (FinOps)
O Event Bus atua sob o stream fundamental de `events:finops`:
- `FINOPS_ALERT_TRANSITION` (Muda os limites de Budget para degradação/prevenção)
- `FINOPS_LOCK_TRANSITION` (Lock de LLMs por limite do mês ultrapassado)
- `FINOPS_MONTHLY_RESET` (Reseta tenant budget do mês virado)
- `CACHE_INVALIDATE` (Limpa cache front end Cockpit / Tenant State via event-dispatch)

## Como executar o Worker Localmente
O seu servidor/app (.NET, Next) não irá rodar esse loop por debaixo dos panos automaticamente pra evitar duplicação em Deployments Serverless. Portanto:

1. Suba/tenha seu servidor Redis configurado no `.env` 
2. Inicie no terminal o worker através do script da CLI (`tsx` já configurado na workspace):
   ```bash
   npm run worker:finops
   ```

Ele rodará e fará polling em blocks de 2 segundos aguardando os IDs de Eventos do stream principal.
- Caso caia, o `finops-group` manterá os eventos parados aguardando ACK; quando reconectar, eles continuarão.
- Se 5 retries de exponencial backoff ocorrerem sob a mesma key sem sucesso de processamento, ele enviará o log pro subset `events:finops:dlq` (Dead Letter Queue) com o motivo registrado e confirmará (ACK) o processamento na lista padrão, liberando a fila original.

## DLQ Endpoint de Observabilidade
Para saber o que quebrou e deu bypass no Worker, use a API protegida:
```bash
curl -H "x-internal-token: seu_token_aqui" http://localhost:3015/api/internal/events/dlq?stream=events:finops
```
Isso mostrará o stack das últimas 50 requisições mortas.
