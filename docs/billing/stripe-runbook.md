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

## 🚑 Reconciliação Pós-Ausência Manual

Caso um checkout seja efetuado com os painéis ou webhook offline, **aplique estes SQLs manuais (safety on)**:

```sql
-- 1. Inserir manualmente no banco IDs perante o Stripe locatário orfão:
UPDATE tenant_subscriptions
SET
  stripe_customer_id = 'cus_PAGORFAO',
  stripe_subscription_id = 'sub_NOVAASSINATURA',
  status = 'active',
  ended_at = NULL
WHERE tenant_id = 'sua-tenant-id-orf\~a' 
  AND status != 'canceled'; -- NUNCA altere sem validar.
```

Para upgrades isolados falhados, pode chamar no painel administrativo Cockpit o endpoint já criado de _fallback_: `POST /api/cockpit/billing/upgrade`.
