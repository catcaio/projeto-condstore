# Linear-Antigravity Bridge

Ponte local funcional para receber webhooks do Linear e preparar o acionamento local do Antigravity para auditoria de PRs.

## Instalação e Uso Local

1.  **Dependências**:
    ```bash
    cd bridge
    npm install
    ```

2.  **Configuração**:
    - Copie `.env.example` para `.env`: `cp .env.example .env`
    - Insira seu `LINEAR_WEBHOOK_SECRET` (obtido no painel de desenvolvedor do Linear).

3.  **Execução**:
    ```bash
    npm run dev
    ```
    O servidor estará ativo em `http://localhost:3333`.

## Testes

### Healthcheck
```bash
curl http://localhost:3333/health
```

### Webhook (Simulação)
```bash
curl -X POST http://localhost:3333/linear/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "Issue",
    "action": "update",
    "data": {
      "id": "test-id",
      "identifier": "MPV-84",
      "title": "PR5 Block",
      "url": "https://linear.app/condstoreos/issue/MPV-84/test",
      "labels": {
        "nodes": [
          { "name": "antigravity-audit" }
        ]
      },
      "description": "ANTIGRAVITY AUDIT GATE — CI verde"
    }
  }'
```

## Exposição (ngrok)
Para receber webhooks reais do Linear em sua máquina local:
```bash
ngrok http 3333
```
Configure a URL gerada no Linear como: `https://seu-id.ngrok-free.app/linear/webhook`

## Handoff de Auditoria
Quando um gatilho é detectado (ex: label `antigravity-audit`), um arquivo JSON é gerado em:
`bridge/outbox/antigravity-audit-handoff-<ID>.json`

Este arquivo contém o contexto completo e o prompt recomendado para que o Antigravity inicie a auditoria da PR.
