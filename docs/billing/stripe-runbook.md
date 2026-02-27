# Stripe Webhook — Runbook & Troubleshooting Prod

Runbook rápido para administrar incidentes de faturamento online, monitorar a sanidade da intersecção com o Stripe e rodar com segurança transições de contas.

## Configuração Mínima Pré-Go-Live

Antes de alterar o `NEXT_PUBLIC_STRIPE_ENABLED` para `1` em PRD, cheque esta matriz:

- [ ] **Envs (obrigatórias)**:
  - `STRIPE_SECRET_KEY` (Chave secreta "Live Mode" começada por `sk_live_...`)
  - `STRIPE_WEBHOOK_SECRET` (Gerada no endpoint webhooks, ex `whsec_...`)
  - `STRIPE_PRICE_GROWTH`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_SCALE` (Obrigatórios para a _whitelist_)
- [ ] **Migrations Aplicadas**: 0012 confirmadas no BD de Produção (`stripe_event_id` unique column ativado).
- [ ] **Endpoint Configurado no Stripe Dashboard**: A URL final na aba _Developers > Webhooks_ deve apontar para `https://<dominio>/api/webhook/stripe`.
- [ ] **Assinatura (Eventos ouvidos)**: Confirme que os seguintes eventos estão na checklist do Webhook:
  - `checkout.session.completed`
  - `invoice.paid`
  - `customer.subscription.deleted`

---

## 🔒 Rotacionando Chaves e Zero Downtime

Caso a sua `STRIPE_WEBHOOK_SECRET` seja comprometida ou se queira rotacioná-la anualmente:

1. **Gere novo Webhook URI ou Key no Stripe Dashboard**. O Stripe permite manter a chave anterior ativa em paralelo com a nova por até 24 horas ("Rolling keys").
2. Atualize o `STRIPE_WEBHOOK_SECRET` no gerenciador de segredos de produção (ou VaultVercel).
3. Efetue **Restart** dinâmico da aplicação (zero downtime) ou _redeployment_ para a nova variável fluir ao node.
4. O Webhook validará automaticamente a nova assinatura. Monitore `stripe_webhook_secret_missing` ou `.error` caso quebre (400 HTTP).
5. Exclua a chave antiga no painel do Stripe após as 24 horas expirararem.

---

## 🛠 Depuração Rápida & Troubleshooting Ocorridos

As rejeições ou exceções sempre devolvem um _HTTP 200_ ao Stripe para **evitar o retries de avalanche**. A depuração baseia-se _sempre_ nos logs do servidor.

### 1. "Evento Duplicado" (Idempotência Disparou)
- **Sintoma HTTP:** Corpos `{ received: true, duplicate: true }`.
- **Análise DB:**
  Se um evento foi repetidamente reenviado pela nuvem (rede gaga ou bug de listener secundário), o UNIQUE em `stripe_events.stripe_event_id` blindará a aplicação. Você verá o log `stripe_event_duplicate_skipped`.
- **Ação:** Não há ação; a aplicação bloqueou e reagiu de forma natural e _safe_.

### 2. "unknown_price" (PriceId fora de Whitelist)
- **Sintoma HTTP/Log:** `{ reason: "unknown_price" }` com log amarelo `stripe_checkout_unknown_price`.
- **Análise DB:**
  O locatário/tenant pode ter passado num _price ID_ antigo (descontinuado no env PRD) ou forjado.
- **Ação:**
  - Conferir se as VMs têm as ENV vars atualizadas (`STRIPE_PRICE_PRO` etc).
  - Atualize a Vercel/VPS se simular migração manual no locatário.

### 3. "missing_tenant_binding" (Cliente órfão)
- **Sintoma HTTP/Log:** `{ reason: "missing_tenant_binding" }`
- **Análise DB/Rede:**
  O cliente pagou em um link direto avulso sem amarrar IDs ou metadados da sessão expiraram de cache.
- **Ação:** Reconciliação Manual.
  1. Identifique no Dashboard o pagamento pago sem cliente (`stripe_checkout_missing_tenant`).
  2. Pegue o email de pagamento do cliente através do console do Stripe.
  3. Amarre no banco usando a próxima etapa.

### 4. "already_canceled" (Anti-Reativação de Acidente)
- **Sintoma HTTP:** `{ reason: "already_canceled" }` num evento `invoice.paid`.
- **Análise DB:**
  Uma _Invoice_ tardia do Stripe (ex: cobrança em retry atrasada que caiu na conta) não vai reativar o `tenant_subscriptions` que você/administrador já cancelou definitivamente (`endedAt != null`). O bloqueador salvou o _loop_.

---

## 🚑 Reconciliação Manual (Break Glass)

Em caso de webhook offline, key rotation, ou suspeita de drift entre DB local e Stripe, use o endpoint interno de reconciliação.

### Quando usar

- **Webhook outage**: eventos perdidos durante downtime.
- **Suspeita de drift**: status local difere do Stripe (ex: tenant ativo localmente mas cancelado no Stripe).
- **Pós-rotation**: após rotacionar chaves, garantir que nenhum evento foi perdido.

### Endpoint

```
POST /api/internal/billing/reconcile-stripe
Header: x-internal-token: <INTERNAL_TOKEN>
```

### Exemplos curl

```bash
# 1. Dry run — ver o que SERIA atualizado (sem alterar DB)
curl -X POST https://<dominio>/api/internal/billing/reconcile-stripe \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d '{"dryRun": true, "limit": 50}'

# 2. Reconciliar um tenant específico
curl -X POST https://<dominio>/api/internal/billing/reconcile-stripe \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d '{"tenantId": "tenant-xyz"}'

# 3. Reconciliar todos (até 200 subscriptions)
curl -X POST https://<dominio>/api/internal/billing/reconcile-stripe \
  -H "Content-Type: application/json" \
  -H "x-internal-token: $INTERNAL_TOKEN" \
  -d '{}'
```

### Interpretando resultados

```json
{
  "processedCount": 42,
  "updatedCount": 3,
  "driftCount": 1,
  "dryRun": false,
  "items": [
    {
      "tenantId": "tenant-1",
      "subscriptionId": "sub_xxx",
      "before": "active",
      "after": "past_due",
      "action": "sync:status"
    }
  ]
}
```

| Campo | Significado |
|-------|------------|
| `processedCount` | Total de subscriptions verificadas contra o Stripe |
| `updatedCount` | Quantas foram efetivamente atualizadas no DB |
| `driftCount` | Quantas têm divergência irreconciliável (ex: endedAt local com Stripe ativo) |
| `action: drift_*` | Drift detectado — requer análise manual |
| `action: sync:*` | Campos sincronizados (ex: `sync:status,cancelAtPeriodEnd`) |
| `action: no_change` | Já sincronizado, nenhuma ação necessária |

### ⚠️ Regra de segurança

O endpoint **NUNCA reativa** uma subscription com `endedAt != null`. Se houver drift (Stripe diz active mas DB diz canceled), o endpoint reporta `driftCount` sem alterar. Investigue manualmente.

---

## 🔧 Reconciliação SQL Manual (último recurso)

Caso o endpoint acima não seja suficiente, aplique SQLs manuais:

```sql
-- Inserir manualmente IDs do Stripe em tenant órfão:
UPDATE tenant_subscriptions
SET
  stripe_customer_id = 'cus_PAGORFAO',
  stripe_subscription_id = 'sub_NOVAASSINATURA',
  status = 'active',
  ended_at = NULL
WHERE tenant_id = 'sua-tenant-id'
  AND status != 'canceled'; -- NUNCA altere sem validar.
```

Para upgrades isolados falhados, use o endpoint de _fallback_: `POST /api/cockpit/billing/upgrade`.

---

## 🚀 GO-LIVE CHECKLIST

Antes de ligar o billing Stripe em produção, percorra esta lista na ordem:

### 1. Environment Variables

- [ ] `NEXT_PUBLIC_STRIPE_ENABLED=1`
- [ ] `STRIPE_SECRET_KEY=sk_live_...`
- [ ] `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] `STRIPE_PRICE_PRO=price_...`
- [ ] `STRIPE_PRICE_GROWTH=price_...` (se aplicável)
- [ ] `STRIPE_PRICE_SCALE=price_...` (se aplicável)
- [ ] `INTERNAL_TOKEN` configurado (para reconciliação break-glass)

### 2. Stripe Dashboard

- [ ] Webhook endpoint criado: `https://<domínio>/api/webhook/stripe`
- [ ] Eventos habilitados:
  - `checkout.session.completed`
  - `invoice.paid`
  - `invoice.payment_failed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- [ ] API version compatível com SDK instalado (`2026-02-25.clover`)

### 3. Database

- [ ] Migration 0010 (billing_core) aplicada
- [ ] Migration 0011 (billing_stripe) aplicada
- [ ] Migration 0012 (stripe_events_unique) aplicada
- [ ] Migration 0013 (stripe_subscription_lifecycle) aplicada
- [ ] Planos seed inseridos na tabela `plans` (plan_pro, plan_growth, plan_scale)

### 4. Validação Pré-Live

- [ ] Rodar reconcile-stripe em dry run: `curl -X POST .../api/internal/billing/reconcile-stripe -H "x-internal-token: $TOKEN" -d '{"dryRun":true,"limit":10}'`
- [ ] Confirmar `updatedCount=0` (ou investigar drifts)
- [ ] Testar fluxo completo em **Test Mode** do Stripe (checkout → invoice → cancel)
- [ ] Verificar logs: `stripe_checkout_completed_processed`, `stripe_invoice_paid_processed`

### 5. Ativação

- [ ] Mudar `NEXT_PUBLIC_STRIPE_ENABLED` para `1` e fazer deploy
- [ ] Monitorar primeiros 10 minutos: logs de webhook, `stripe_event_duplicate_skipped` (normal em retry), erros 500

### 6. Plano de Rollback

Se algo crítico falhar após go-live:

1. Setar `NEXT_PUBLIC_STRIPE_ENABLED=0` (desliga checkout no frontend — webhooks continuam processando)
2. Se necessário parar webhooks: remover endpoint no Stripe Dashboard
3. Subscriptions existentes continuam funcionando via billing manual (`POST /api/cockpit/billing/upgrade`)
4. Investigar logs, rodar reconcile-stripe para corrigir drift, e reativar
