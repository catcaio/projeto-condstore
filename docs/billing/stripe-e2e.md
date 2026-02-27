# Stripe Webhook — End-to-End Local Guide

Este guia detalha como testar o fluxo de faturamento do Stripe localmente em seu ambiente de desenvolvimento. Ele cobre o "caminho feliz" e as checagens dos casos extremos de negócios tratadas pelo endpoint do Webhook.

## Pré-requisitos (Comandos Exatos)

Abra um terminal na raiz do projeto Condstore e configure as variáveis de ambiente necessárias.

```bash
# 1. Habilitar o Stripe
export NEXT_PUBLIC_STRIPE_ENABLED=1

# 2. Inserir Chaves do Stripe (use as chaves de "Test Mode" do Stripe Dashboard)
export STRIPE_SECRET_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...

# 3. Configurar os IDs de preço no Stripe para baterem com o banco (Exemplo)
export STRIPE_PRICE_PRO=price_1Q...
export STRIPE_PRICE_GROWTH=price_1Q...
export STRIPE_PRICE_SCALE=price_1Q...
```

Após configurar ambiente, deixe banco e aplicação rodando:

```bash
# 4. Rodar e garantir migrations atualizadas
npm run db:push

# 5. Iniciar a aplicação local
npm run dev
```

## Configurar Stripe CLI (Terminal 2)

Abra **outro** terminal para focar exclusivamente no CLI do Stripe.

```bash
# Se nunca logou no Stripe CLI, autentique-se:
stripe login

# Iniciar o escutador de eventos
npm run stripe:listen
# OU manualmente: 
# stripe listen --forward-to localhost:3015/api/webhook/stripe
```
*(Nota: O CLI exibirá o secret a ser colocado na variável `STRIPE_WEBHOOK_SECRET`)*

---

## 🚀 Triggers & Checagens Exatas

Mantenha os dois terminais abertos (Next.js e Stripe CLI).
Abra um **terceiro terminal** para disparar eventos:

### 1. Checkout Session Completed (Upgrade de Plano)

```bash
npm run stripe:trigger:checkout
# OU
# stripe trigger checkout.session.completed
```
**Opcional:** Para injetar _metadata_ realística, você deve forçar `--override`:
```bash
stripe trigger checkout.session.completed \
  --override checkout_session:metadata.tenantId=tenant_id_aqui \
  --override checkout_session:metadata.planId=plan_pro \
  --override checkout_session:metadata.priceId=$STRIPE_PRICE_PRO \
  --override checkout_session:mode=subscription \
  --override checkout_session:payment_status=paid
```

**Verificações no webhook / banco:**
- [ ] **HTTP Response:** Stripe CLI deve acusar código `200`. Se faltou _metadata_ (via trigger simples sem override), você deve ver no corpo da resposta um retorno amigável com `{ ignored: true, reason: "missing_tenant_binding" }`.
- [ ] **Log (Server):** `stripe_checkout_completed_processed` com ID local do plano, tenant e preço resolvido (ou `stripe_checkout_missing_tenant` dependendo de metadata).
- [ ] **DB `stripe_events`:** Novo registro foi inserido com seu webhook signature/hash. O `type` = `checkout.session.completed`.
- [ ] **DB `tenant_subscriptions`:** `stripe_customer_id` e `stripe_subscription_id` foram preenchidos para o seu locatário.

### 2. Invoice Paid (Renovação de Assinatura Cancelada/Inadimplente)

```bash
npm run stripe:trigger:invoice
# OU
# stripe trigger invoice.paid
```
**Opcional:** Para testar a reativação propriamente, deve amarrar ao respectivo `subscription_id` persistido antes.
```bash
stripe trigger invoice.paid \
  --override invoice:subscription=sub_id_do_banco \
  --override invoice:parent:subscription_details:subscription=sub_id_do_banco
```

**Verificações no webhook / banco:**
- [ ] **HTTP Response:** `200`. Se passou no gate local: `{ received: true }`. Se ignorado: `{ received: true, ignored: true, reason: "already_canceled" }`.
- [ ] **Log (Server):** `stripe_invoice_paid_processed` documentando o status resgatado ou `stripe_invoice_paid_skipped_canceled` se a assinatura testada já estava desativada/cancelada permanentemente localmente (`endedAt != null`).
- [ ] **DB `tenant_subscriptions`:** Campo `status` deve ser igual a `active`. Campo `endedAt` devia igual a `NULL`.

### 3. Subscription Deleted (Cancelamento Fixo)

```bash
npm run stripe:trigger:cancel
# OU
# stripe trigger customer.subscription.deleted
```
**Opcional:** Passar subscription persistida no banco local.
```bash
stripe trigger customer.subscription.deleted \
  --add customer_subscription:id=sub_id_do_banco
```

**Verificações no webhook / banco:**
- [ ] **HTTP Response:** `200` ({ received: true }).
- [ ] **Log (Server):** `stripe_subscription_deleted_processed` validando expiração automática.
- [ ] **DB `stripe_events`:** Novo ID de idempotência persistido.
- [ ] **DB `tenant_subscriptions`:** Campo `status` deve estar em `canceled`. O campo `endedAt` assumiu a data e a hora precisas do cancelamento efetivo gerado.
