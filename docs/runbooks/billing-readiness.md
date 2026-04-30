# Runbook: Billing & Stripe Readiness

## Objetivo
Garantir que a infraestrutura de faturamento (Stripe) e as regras de restrição de acesso (guardrails) estejam operacionais.

## Variáveis (Nomes)
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (opcional dependendo da UI)

## Validação Automatizada
```bash
npm run billing:readiness
```

## Checklist Operacional
- [ ] Tenant tem `planStatus` válido (`active` ou `trialing`).
- [ ] Operadores bloqueados se o plano expirar (validado pelo guard).
- [ ] Webhook endpoint em `/api/webhook/stripe` preparado para escutar eventos.

## MANUAL_RAFA (Próximos Passos Reais)
1. Cadastrar chaves do Stripe no ambiente de produção.
2. Configurar o Webhook no painel do Stripe apontando para a URL correta.
3. Cadastrar o primeiro plano (Produto) e linkar o `stripeCustomerId` ao tenant.
