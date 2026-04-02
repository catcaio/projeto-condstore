# CONDSTORE OS — Architecture

Documento técnico interno para navegação arquitetural do estado atual do código.

## 1) Visão sistêmica

CONDSTORE OS é uma aplicação Next.js com App Router que combina:

- superfícies web (cockpit, áreas operacionais, páginas públicas e hubs didáticos isolados por rota),
- API routes HTTP,
- módulos de domínio,
- infraestrutura transversal (auth, segurança, banco, cache, observabilidade),
- integrações externas (Twilio, Stripe, providers LLM, Qdrant, Melhor Envio).

Fluxo macro:

```txt
UI / Webhook / Internal call
  -> src/middleware.ts
  -> src/app/api/**/route.ts
  -> guards e validações
  -> services (src/modules/* e src/core/*)
  -> repositories (src/infra/repositories/*)
  -> Drizzle/MySQL + Redis
  -> eventos operacionais/DOMINE
```

## 2) Camadas e responsabilidades

| Camada | Paths principais | Responsabilidade |
|---|---|---|
| Edge/Gateway | `src/middleware.ts` | Enforcement inicial de sessão, tokens internos, bloqueios e injeção de headers de auth |
| API | `src/app/api/**` | Contrato HTTP, parsing/validação, chamada de guards e serviços |
| Domínio | `src/modules/**` | Casos de uso de negócio (atendimento, frete, pedidos, frank, etc.) |
| Núcleo transversal | `src/core/**`, `src/lib/**` | IA gateway, eventos, políticas, segurança/apoio a integração |
| Infra | `src/infra/**` | DB, auth, redis, logging, observabilidade, repositórios, rate limit/circuit breaker |
| Dados | `src/drizzle/schema.ts`, `src/drizzle/migrations/**` | Modelo físico e evolução de schema |

## 3) Fluxo request -> auth -> handlers -> serviços -> dados

### Request HTTP padrão autenticado

```txt
Request
  -> middleware.ts
     - valida cookie JWT (quando aplicável)
     - remove headers de spoofing
     - injeta x-auth-tenant-id / x-auth-user-id / x-auth-role
  -> route.ts
     - requireSession / requireAdmin / requireSessionTenantMatch / requireInternalAuth
  -> service
  -> repository
  -> getDb() + queries tenant-scoped
```

### Webhooks (ex.: WhatsApp)

```txt
POST /api/whatsapp/incoming
  -> valida assinatura Twilio
  -> resolve tenant por número destino
  -> normaliza/hash de telefone
  -> rate limiter
  -> whatsappInboundOrchestrator.process(...)
  -> aplica policy (ACK_ONLY / SUPERVISED_NO_REPLY / AUTO_REPLY_ALLOWED)
```

## 4) Modelo multi-tenant e propagação de contexto

Isolamento por tenant é implementado em múltiplas barreiras:

1. **Sessão JWT** com `tenantId`.
2. **Middleware** bloqueando mismatch em rotas `/api/tenants/[tenantId]`.
3. **Guards de rota** (`requireSessionTenantMatch`, `requireSession`, `requireAdmin`, `requireInternalToken/requireInternalAuth`).
4. **Queries com escopo de tenant** (`eq(table.tenantId, tenantId)` e helpers `withTenantNotDeleted` / `withTenantIdNotDeleted`).

### Invariantes críticas

- `tenantId` de operações autenticadas deve vir da sessão/guard, não do body.
- Rotas internas exigem token interno (ou admin session onde permitido).
- Operações em entidades soft-delete devem usar helpers com `deletedAt IS NULL`.

## 5) Módulos de domínio ativos

| Módulo | Paths | Papel no sistema |
|---|---|---|
| Atendimento | `src/modules/atendimento/**` | Inbound WhatsApp, conversas, políticas de resposta, métricas de pipeline |
| Freight | `src/modules/freight/**` | Simulação, roteamento/adapters de transportadora, memória e auditoria de frete |
| CRM | `src/modules/crm/**`, `src/modules/clientes/**` | Oportunidades, notas/tarefas/quotes e composição de visão de clientes |
| Pedidos | `src/modules/pedidos/**` | Carregamento/serviço de pedidos e integração com contexto logístico |
| Logistics | `src/modules/logistics/**`, `src/modules/logistica/**` | Serviço/repositório de shipments + superfícies de operação logística |
| Cockpit | `src/modules/cockpit/**` | Dados agregados para painéis, alertas, filas, métricas e atalhos |
| Frank | `src/modules/frank/**`, `src/core/ai/**` | Intent/context resolver, sugestões, tools, memória, gateway LLM e governança |
| DOMINE | `src/modules/domine/**`, `src/domine/**` | Publicação/processamento de eventos com status, retries e DLQ |
| Billing/FinOps | `src/modules/billing/**`, `src/modules/finops/**` | Plano, Stripe webhook/service e enforcement operacional por plano |

## 6) Integrações externas reais

- **Twilio**: webhook inbound e envio outbound com tenant config e kill-switch.
- **Stripe**: webhook de billing + cliente singleton com circuit breaker.
- **Providers LLM**: via gateway central (`src/core/ai/llm-gateway.ts`) e providers OpenAI-compatible.
- **Qdrant**: clientes/adapters para vetores e reindex.
- **Melhor Envio**: adapter de frete em `src/modules/freight/adapters/`.

## 7) Frank/AI: limites de runtime e governança

A arquitetura de IA está centralizada e não deve chamar provider diretamente em rota.

Pipeline principal:

```txt
Route/Service
  -> core/ai/llm-gateway.ts
     - resolve provider por tenant
     - aplica redação PII, injeção/prompt guard, limites e telemetria
     - registra eventos/tokens
```

Controles observáveis no código:

- Flags: `FRANK_RUNTIME_ENABLED` e `FRANK_RUNTIME_MODE`.
- Modo supervisionado suportado (`SUPERVISED_ONLY`) para geração de sugestão sem envio autônomo indiscriminado.
- Tool model com guard de execução (`src/modules/frank/tools/tool-guard.ts`).
- Agent loop mínimo para ações operacionais críticas: `src/modules/frank/agent-loop.ts` (planner + policy + memory + telemetry), integrado de forma compatível no fluxo `Quote -> Order`.

## 8) Segurança e invariantes arquiteturais

- **Auth em camadas**: middleware + guards por rota.
- **Assinatura webhook**: validação de Twilio e Stripe antes de processamento.
- **PII**: criptografia (`src/infra/pii/crypto.ts`) e redação em logs (`src/infra/log/logger.ts`) e eventos (`src/lib/events/operational-event-bus.ts`).
- **Resiliência**: circuit breaker e rate limiter em integrações/fluxos críticos.
- **Token interno por propósito**: contrato explícito (`diag`, `export`, `jobs`, `qa_bootstrap`) com regras de runtime estrito.

## 9) Eventos, filas e assíncrono

Existem dois trilhos principais:

1. **Operational Event Bus** (`src/lib/events/operational-event-bus.ts`)
   - fire-and-forget para eventos de negócio,
   - sanitização de campos PII,
   - persistência em `operational_events`.

2. **DOMINE Event Bus** (`src/modules/domine/event-bus.service.ts`)
   - publicação com idempotency key,
   - processamento assíncrono (`processAsync`),
   - fallback para DLQ e incidente por tenant quando volume de falhas cresce.

## 10) Observabilidade e diagnóstico

- **Logs estruturados JSON**: `src/infra/log/logger.ts`.
- **Request tracing**: `src/infra/http/request-trace.ts`.
- **Sentry (opcional)**: `src/infra/observability/sentry.ts`.
- **Eventos de segurança na edge**: `src/lib/security/edge-logger` usados pelo middleware.

## 11) Runtime, deploy e quality gates

- **Deploy alvo**: Vercel (`vercel.json` + scripts/build Next).
- **CI principal**: `.github/workflows/ci.yml`.

Gates executados em CI:

1. `check-env-leak`
2. `routes:sync`
3. `routes:verify-security`
4. `typecheck`
5. `lint`
6. `test:coverage`
7. `build`
8. `db:verify`
9. `guardrails-public-api`

## 12) Pontos de atenção arquitetural

- O código contém módulos/UI em estágios de maturidade diferentes (partes com mock/placeholder coexistem com serviços e schema já reais).
- Em runtime estrito, segredos críticos (auth, tokens internos, redis e integrações) devem estar presentes; não assumir fallback de desenvolvimento.
- Qualquer novo fluxo deve manter: escopo de tenant, logs estruturados, tolerância a falhas externas e uso do gateway central para IA.
