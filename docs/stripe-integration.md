## Stripe Integration v1

### Setup

```bash
npm i stripe
```

### Environment Variables

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_GROWTH=price_...       # $49/mês
STRIPE_PRICE_PRO=price_...          # $99/mês
STRIPE_PRICE_SCALE=price_...        # $299/mês
NEXT_PUBLIC_STRIPE_ENABLED=1        # 0 = modo manual (sem Stripe)
```

### Testando com Stripe CLI

```bash
# 1. Instalar Stripe CLI (https://stripe.com/docs/stripe-cli)
brew install stripe/stripe-cli/stripe

# 2. Login
stripe login

# 3. Forwarding para dev local
stripe listen --forward-to localhost:3015/api/webhook/stripe

# 4. Disparar evento de teste
stripe trigger checkout.session.completed

# 5. Simular cancelamento
stripe trigger customer.subscription.deleted
```

### Fluxo Completo: Lock → Checkout → Webhook → Unlock

```
1. Tenant state = 'locked' (tenant_budgets.currentLockState)
2. FinOpsCard exibe ⚡ Upgrade Plan
3. (se STRIPE_ENABLED=1) POST /api/cockpit/billing/checkout { planId:"plan_pro" }
   → Stripe cria checkout session → retorna { url }
   → window.location.href = url  (redireciona para Stripe Checkout)
4. Usuário completa pagamento no Stripe
5. Stripe dispara POST /api/webhook/stripe com checkout.session.completed
6. Webhook handler:
   a. Valida assinatura com STRIPE_WEBHOOK_SECRET
   b. INSERT stripe_events (idempotência) — se já existe → 200 early return
   c. Extrai tenantId + planId do session.metadata
   d. upgradeTenantPlan(tenantId, planId)
      ├─ billing_ledger entry
      ├─ tenant_subscriptions (active + stripe ids)
      ├─ tenant_budgets (budget, softLimit, unlocked, revision++)
      ├─ finops_lock_events resolved
      └─ Redis caches invalidados
7. Tenant volta para state = 'unlocked' ✅
```

### Fallback sem Stripe (modo manual)

Quando `STRIPE_SECRET_KEY` estiver ausente ou `NEXT_PUBLIC_STRIPE_ENABLED=0`:
- `POST /api/cockpit/billing/checkout` retorna `400 { error: "STRIPE_DISABLED" }`
- FinOpsCard usa o fluxo manual `POST /api/cockpit/billing/upgrade` com seletor de planos interno
- Compliance mantida: billing_ledger + subscription + budget update funcionam independentemente
