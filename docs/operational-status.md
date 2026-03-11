# CONDSTORE OS — Status Operacional

> Atualizado em: 2026-03-11
> Contexto: Etapa pré-site principal. Base operacional sendo solidificada.

## Status de Dados por Módulo

| Módulo | Fonte Atual | Tabela(s) DB | Status |
|--------|------------|--------------|--------|
| **cockpit** | Real + fallback | `messages`, `domine_orders`, `freight_shipments`, `domine_freight_quotes`, `simulations`, `operational_events`, `domine_events`, `tenant_incidents`, `webhook_events` | ✅ Real com fallback isolado |
| **conversas** | Mock (20 seeds) | `messages` (WhatsApp audit) | ⚠️ Fallback — dados de lista/thread são mock; `messages` só carrega dados quando há conversas reais no WhatsApp |
| **clientes** | Mock (25 seeds) | **Nenhuma tabela de clientes** | 🔴 Totalmente mock — sem tabela `customers` no schema |
| **pedidos** | Mock (30 seeds) | `domine_orders` | ⚠️ Fallback — tabela existe mas o módulo de view ainda consome mock |
| **logística** | Mock (30 seeds) | `freight_shipments`, `domine_freight_quotes`, `simulations` | ⚠️ Fallback — tabelas existem mas o módulo de view ainda consome mock |

### Por que os módulos operacionais ainda estão em mock

Os módulos `conversas`, `clientes`, `pedidos` e `logística` são **componentes client-side** (`'use client'`) com layout triplo (lista densa + detalhe + contexto). A migração para dados reais requer:

1. **API routes** para servir os dados (server-side)
2. **Data layer** no padrão do cockpit (`data/get-*-data.ts` com `safeLoad()`)
3. **Client-side fetching** com estado de loading/error

A decisão foi **não criar APIs fake** — quando o backend tiver os endpoints reais, o `types.ts` já separado facilita a integração sem tocar no layout.

### Clientes — sem tabela no banco

O módulo `clientes` não tem correspondência no schema do banco (`src/drizzle/schema.ts`). Uma tabela `customers` precisará ser criada quando houver CRM real ou integração. Até lá, o mock serve como demonstração do layout e dos deep links.

## Health Check — Comportamento

### `/api/internal/health/ai`

| Cenário | Resposta | HTTP Status |
|---------|----------|-------------|
| Sem env `DEFAULT_LMSTUDIO_BASE_URL` nem `DEFAULT_CLOUD_BASE_URL` | `{ ok: false, skipped: true, reason: "..." }` | 200 |
| Provider configurado mas inacessível | `{ ok: false, error: "..." }` | 503 |
| Provider configurado e saudável | `{ ok: true, url, model, embedModel }` | 200 |

**Importante**: Em ambiente local/dev sem LM Studio rodando, o health check retorna `skipped: true` sem bloquear o fluxo. Isso evita falsos negativos em CI ou desenvolvimento.

### Envs necessárias para AI

| Variável | Obrigatória? | Descrição |
|----------|:---:|-----------|
| `DEFAULT_LMSTUDIO_BASE_URL` | Não* | URL do LM Studio ou provider local |
| `DEFAULT_CLOUD_BASE_URL` | Não* | URL do provider cloud (fallback) |
| `DEFAULT_LMSTUDIO_MODEL` | Não* | Modelo LLM principal |
| `DEFAULT_EMBED_MODEL` | Não* | Modelo de embeddings |
| `DEFAULT_AI_TIMEOUT_MS` | Não | Timeout do health check (default: 5000ms) |

\* Todas são opcionais para rodar o projeto. São obrigatórias apenas para funcionalidades de IA (Frank, embeddings, etc).

## Ambiente Local — Envs Obrigatórias

Para rodar o projeto localmente (`npm run dev`):

| Variável | Fonte |
|----------|-------|
| `AUTH_SECRET` | `.env.local` |
| `DATABASE_URL` | `.env.local` — MySQL |
| `SEED_TOKEN` | `.env.local` |

## Limites Conhecidos Antes do Site Principal

1. **Módulos operacionais em mock**: Conversas, clientes, pedidos e logística mostram dados de demonstração
2. **Sem CRM real**: Não há tabela de clientes no banco
3. **Frank/AI opcional**: Funcionalidades de IA dependem de LM Studio ou cloud provider
4. **Carrier tables**: Tabelas de frete normalizadas existem mas dependem de seed manual
5. **WhatsApp**: Conversas reais dependem de webhook Twilio configurado
