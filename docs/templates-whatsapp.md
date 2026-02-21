# WhatsApp Templates — Documentação de Configuração

Todos os templates enviados pelo sistema fora da janela de 24h do WhatsApp devem ser aprovados pela Meta e configurados como Twilio Content API SIDs no Painel Twilio.

---

## Variáveis de Ambiente Necessárias

| Variável | Descrição | Exemplo |
|---|---|---|
| `WHATSAPP_TEMPLATE_REENGAGE_FRETE` | Template de reengajamento — cotação de frete abandonada | `HXabc123def456...` |
| `WHATSAPP_TEMPLATE_PEDIR_DADOS` | Template para pedir CEP/dados quando sessão travou em CEP_PROVIDED | `HXdef456ghi789...` |
| `WHATSAPP_TEMPLATE_STATUS_PEDIDO` | Template de status de pedido (envio proativo) | `HXghi789jkl012...` |
| `TWILIO_WHATSAPP_NUMBER` | Número da sandbox/produção Twilio WhatsApp | `+14155238886` |
| `CRON_SECRET` | Segredo aleatório para autenticar o cron job | `sh-abc123xyz...` |
| `SESSION_SLA_TIMEOUT_MINUTES` | Tempo em minutos antes de expirar a sessão por SLA (padrão: 60) | `60` |
| `STALE_SESSION_MINUTES` | Tempo em minutos para considerar sessão "parada" e reengajar (padrão: 30) | `30` |
| `REENGAGE_LOOKBACK_MINUTES` | Intervalo mínimo entre tentativas de reengajamento (padrão: 360 = 6h) | `360` |

---

## Como Criar um Template na Twilio (Content API)

1. Acesse o [Twilio Console → Content](https://console.twilio.com/us1/develop/sms/content-editor).
2. Crie um `text` template com variáveis `{{1}}`, `{{2}}`, etc.
3. Submeta para aprovação Meta via "Send for Meta Approval".
4. Após aprovado, copie o **Content SID** (começa com `HX`) e cole na variável de ambiente correspondente.

**Exemplo de template `REENGAGE_FRETE`:**
```
Olá {{1}}! Percebemos que você não finalizou a cotação de frete. Deseja continuar? Responda "sim" para retomar.
```

---

## Ativando o Cron na Vercel

Adicione ao `vercel.json` (raiz do projeto):

```json
{
  "crons": [
    {
      "path": "/api/cron/reengage",
      "schedule": "0 * * * *"
    }
  ]
}
```

O Vercel chamará automaticamente o endpoint a cada hora.

Para autenticar a chamada, configure no Vercel Dashboard:
- `CRON_SECRET` = qualquer string aleatória segura
- O Vercel enviará o header `x-cron-secret: <valor>` automaticamente em invocações CRON **se você usar `Vercel-Cron-Auth`**. 

> **Atenção:** A Vercel não injeta o header automaticamente. O fluxo correto é configurar o segredo tanto no código quanto no header manual via chamadas externas, ou usar um scheduler externo (ex: Render, Railway, cron-job.org) apontando para `/api/cron/reengage?secret=xxx`.

Para uso simples, faça:
```
GET https://your-app.vercel.app/api/cron/reengage
x-cron-secret: <CRON_SECRET>
```

---

## Janela de 24 horas

O WhatsApp Business só permite mensagens freeform dentro da janela de 24h após a **última mensagem do usuário**. Fora dessa janela, apenas templates aprovados pela Meta podem ser enviados.

O sistema detecta automaticamente (via `shouldUseTemplate()`) quando um usuário está fora da janela consultando a tabela `messages` por mensagens `inbound`.

---

## Reengajamento Automático

O cron `/api/cron/reengage`:

1. Busca sessões com funil parado em `ASKED_CEP` ou `CEP_PROVIDED` por mais de `STALE_SESSION_MINUTES` minutos.
2. Exclui números já reengajados nas últimas `REENGAGE_LOOKBACK_MINUTES` minutos.
3. Envia o template apropriado:
   - `ASKED_CEP` → `REENGAGE_FRETE`
   - `CEP_PROVIDED` → `PEDIR_DADOS`
4. Registra evento `REENGAGED` no funil.
