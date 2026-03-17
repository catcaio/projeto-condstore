# Go-Live Scope — Lote 1

**Data de criação:** 2026-03-17
**Branch de referência:** `fix/staging-stable-deploy`
**Merge target:** `main` → Vercel Production

---

## Subsistemas Incluídos no Lote 1

| Subsistema | Status | Observação |
|---|---|---|
| WhatsApp Inbound | ✅ incluído | Webhook Twilio → Orchestrator |
| Cotação Pública | ✅ incluído | Quote Worker via DOMINE |
| Stripe | ✅ incluído | Webhook + Billing |
| Cron / FinOps | ✅ incluído | FinOps Worker + `/api/cron/cleanup` |

## Subsistemas Excluídos do Lote 1

| Subsistema | Motivo |
|---|---|
| Frank AUTONOMOUS | Risco de auto-reply sem supervisão |
| Concept Layer | Experimental, sem validação de negócio |
| Frank Playbooks | Necessita estabilidade operacional antes |
| RAG / Qdrant | Dependência de AI provider, não crítico |

---

## Tenant

| Tenant | ID | Observação |
|---|---|---|
| LojaCond | `lojacond` | Único tenant no Lote 1 |

## Números / Operadores

| Número | Tipo | Observação |
|---|---|---|
| `whatsapp:+14155238886` | Sandbox Twilio | Número configurado em produção |

## Fluxos Ativos

```
Twilio Webhook → /api/webhook (signature validation)
  → Inbound Orchestrator (whatsapp-inbound-orchestrator.service.ts)
    → Reply Policy (whatsapp-reply-policy.ts)
      → ACK_ONLY / SUPERVISED_NO_REPLY / AUTO_REPLY_ALLOWED
    → DOMINE Event Bus
      → quote-worker (cotação)
      → finops-worker (billing/FinOps)
      → webhook-worker (Stripe events)

Cron: /api/cron/cleanup → 03:00 UTC daily
```

## Automações em Modo Conservador

| Automação | Estado | Motivo |
|---|---|---|
| Frank auto-reply | **DESLIGADO** | `FRANK_RUNTIME_ENABLED=false` |
| Frank AUTONOMOUS mode | **DESLIGADO** | Runtime disabled, modo irrelevante |
| Auto-response guard | **ATIVO** | MAX_AUTO_RESPONSES=2 (hardcoded) |
| Reply Policy | **ATIVO** | ACK/supervisão por padrão |

---

## Critério para Sair do Lote 1

- 24h sem incidente crítico
- Webhook saudável (< 1% erro de assinatura)
- Fila DOMINE estável (jobs_failed_total < 5% do total)
- Latência orchestrator < 5s p99
- Stripe sem webhook failure
- Health endpoints retornando 200
