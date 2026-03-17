# Flags Operacionais — Go-Live Lote 1

**Data:** 2026-03-17

---

## Flags de Runtime (app.config.ts)

| Flag | Variável de Ambiente | Valor Go-Live | Default | Impacto Operacional |
|---|---|---|---|---|
| Frank Runtime | `FRANK_RUNTIME_ENABLED` | `false` | `false` | Frank não executa auto-respostas. Cockpit/editorial permanece acessível. |
| Frank Mode | `FRANK_RUNTIME_MODE` | `SUPERVISED_ONLY` | `AUTONOMOUS` | Irrelevante se runtime desligado. Mantido como backup de segurança. |
| Concept Layer | `NEXT_PUBLIC_ENABLE_CONCEPT_LAYER` | `false` | `false` | UI experimental desligada |
| Concept Variant | `NEXT_PUBLIC_CONCEPT_VARIANT` | `A` | `A` | Sem impacto (layer desligada) |
| Stripe | `NEXT_PUBLIC_STRIPE_ENABLED` | `1` | não setado | Billing ativo |

## Flags de Infraestrutura (env)

| Variável | Valor Go-Live | Impacto |
|---|---|---|
| `DATABASE_URL` | TiDB Cloud prod | Banco real, sem fallback |
| `REDIS_URL` | Upstash prod URL | Redis real, sem fallback in-memory |
| `TWILIO_ACCOUNT_SID` | `ACa280e6...` | Conta Twilio ativa |
| `TWILIO_AUTH_TOKEN` | Setado | Validação de assinatura ativa |
| `TWILIO_WEBHOOK_BASE_URL` | `https://app.condstoreos.com` | URL de webhook prod |
| `STRIPE_SECRET_KEY` | `sk_test_...` | Stripe em modo test |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | Validação de webhook Stripe |
| `PII_ENCRYPTION_KEY` | Setado | Criptografia de PII ativa |

## Flags Hardcoded (código)

| Constante | Arquivo | Valor | Impacto |
|---|---|---|---|
| `MAX_AUTO_RESPONSES` | `auto-response-guard.ts` | `2` | Limite de auto-replies antes de forçar SUPERVISED |
| `POLL_INTERVAL_MS` | `queue-worker.ts` | `5000` | Intervalo de polling do queue worker |
| `MAX_RETRIES` | `finops-worker.ts` | `5` | Máximo de retries antes de DLQ |
| `DRAIN_MS` | `finops-worker.ts` | `8000` | Timeout de graceful shutdown |

## Checklist Pré-Deploy

- [ ] `FRANK_RUNTIME_ENABLED` não setado ou `false` no Vercel
- [ ] `FRANK_RUNTIME_MODE` não setado ou `SUPERVISED_ONLY` no Vercel
- [ ] `NEXT_PUBLIC_ENABLE_CONCEPT_LAYER` não setado ou `false`
- [ ] `DATABASE_URL` aponta para TiDB Cloud prod
- [ ] `REDIS_URL` aponta para Upstash prod
- [ ] `TWILIO_AUTH_TOKEN` setado
- [ ] `STRIPE_WEBHOOK_SECRET` setado
- [ ] `PII_ENCRYPTION_KEY` setado
