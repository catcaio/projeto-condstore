# CONDSTORE OS

Sistema SaaS multi-tenant para operação comercial via WhatsApp, CRM e logística, com Cockpit operacional e camada de IA (Frank) em modo supervisionado.

## Visão geral

O repositório concentra uma aplicação Next.js (App Router) com:

## MVP CONDSTORE OS — Documentação oficial

**Lote 1 (MVP) em produção.** Para definições completas do que é o MVP, o que faz, o que não faz e como funciona, consulte [Documentação do MVP](docs/mvp/README.md).

Links rápidos:
- **[O que é o MVP?](docs/mvp/mvp-definition.md)** — Definição, ICP, proposta de valor
- **[Como funciona?](docs/mvp/architecture-map.md)** — Fluxo de sistema, módulos, dependências
- **[O que o operador vê?](docs/mvp/cockpit-map.md)** — Telas, workflows, papéis
- **[O que está fora do escopo?](docs/mvp/boundaries.md)** — Blockers e features não-MVP
- **[Do que dependemos?](docs/mvp/dependencies.md)** — Serviços externos, modos de falha

> **Para qualquer pessoa revisando, implementando ou suportando CONDSTORE OS: Comece por [docs/mvp/README.md](docs/mvp/README.md)**

Para demos/pilotos reproduzíveis, use o runbook em [`docs/demo/demo-tenant-runbook.md`](docs/demo/demo-tenant-runbook.md).

## Capacidades principais (implementadas no código)

- **Atendimento WhatsApp com Twilio**: ingestão webhook, verificação de assinatura, resolução de tenant por número Twilio e políticas de resposta (`ACK_ONLY`, `SUPERVISED_NO_REPLY`, `AUTO_REPLY_ALLOWED`).
- **CRM e atendimento**: serviços/repositórios de conversa, métricas de pipeline, oportunidades e timeline.
- **Frete multi-transportadora**: motor de cotação com adaptadores (incluindo Melhor Envio e tabelas internas), memória operacional e vínculo de shipment.
- **Pedidos e logística**: criação/consulta de pedidos, shipment service/repository e integração com dados de frete.
- **Frank (IA) com governança**: orquestrador, sugestões supervisionadas, tools, memória, intent linker e gateway de provider centralizado.
- **Eventos operacionais e DOMINE**: publicação de eventos com sanitização de PII, processamento assíncrono com DLQ e trilha de auditoria.

## Stack real

- **Runtime/App**: Next.js 16 + React 19 + TypeScript.
- **Banco**: MySQL/TiDB via Drizzle ORM.
- **Cache/limites**: Redis (com fallback em memória fora de runtime estrito).
- **Integrações**: Twilio, Stripe, OpenAI-compatible providers, Qdrant, Melhor Envio.
- **Qualidade**: ESLint, Vitest, TypeScript strict, scripts de verificação de rotas e schema.

## Arquitetura em alto nível

```txt
Request
  -> middleware.ts (sessão, headers de auth, proteção de rotas, token interno)
  -> API Route (src/app/api/**)
  -> guards (requireSession / requireSessionTenantMatch / requireInternalAuth / requireAdmin)
  -> serviço de domínio (src/modules/*, src/core/*)
  -> repositório (src/infra/repositories/*)
  -> Drizzle (src/infra/db.ts) e Redis (src/infra/redis.client.ts)
```

## Estrutura principal do projeto

```txt
src/
  app/                 # páginas e API routes (App Router)
  modules/             # domínio por contexto (atendimento, freight, frank, pedidos, ...)
  core/                # núcleos transversais (AI gateway, eventos, stripe, regras)
  infra/               # auth, db, redis, log, segurança, observabilidade
  drizzle/             # schema e migrações
  lib/                 # utilitários, formatadores e barramento operacional
scripts/               # validações, inventário/segurança de rotas, smoke, QA
docs/                  # estado do produto, runbooks e documentação técnica complementar
```

## Como navegar no código

- Comece por `src/middleware.ts` para entender fronteiras de acesso.
- Veja `src/app/api/whatsapp/incoming/route.ts` para o fluxo real de entrada WhatsApp.
- Siga para `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` e `src/modules/frank/*` para a decisão de resposta.
- Para frete/pedidos/logística: `src/modules/freight/*`, `src/modules/pedidos/*`, `src/modules/logistics/*`.
- Para multi-tenant e guards: `src/infra/auth/*` e `src/infra/db.ts`.
- Para eventos: `src/lib/events/operational-event-bus.ts` e `src/modules/domine/*`.

## Setup local

### 1) Pré-requisitos

- Node.js 20+
- npm
- MySQL local (ou TiDB compatível)
- (Opcional) Redis local

### 2) Banco local (opcional via Docker)

```bash
docker compose up -d mysql
```

### 3) Instalação e execução

```bash
npm install
npm run dev
```

## Variáveis de ambiente essenciais

Sem `.env.example` versionado, então use como base os pontos abaixo.

### Mínimo para subir app localmente

- `DATABASE_URL` (com nome de database no path)
- `AUTH_SECRET`

### Necessárias por capacidade

- **PII/criptografia**: `PII_ENCRYPTION_KEY` (obrigatória em produção; em dev há fallback inseguro).
- **WhatsApp/Twilio**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (e configuração por tenant para envio).
- **Frete/Melhor Envio**: `MELHORENVIO_TOKEN`.
- **Stripe**: `STRIPE_SECRET_KEY` + price IDs (`STRIPE_PRICE_*`) + flag `NEXT_PUBLIC_STRIPE_ENABLED`.
- **Interno/diagnóstico/jobs**: `INTERNAL_DIAG_TOKEN`, `INTERNAL_EXPORT_TOKEN`, `INTERNAL_JOB_TOKEN`, `QA_BOOTSTRAP_TOKEN` e opcional `BOOTSTRAP_TOKEN`.
- **Redis**: `REDIS_URL` (obrigatória em runtime estrito).

## Scripts importantes

- `npm run dev` — desenvolvimento.
- `npm run build` / `npm run start` — build e execução de produção.
- `npm run lint` — lint.
- `npm run lint:secrets-critical` — falha CI se `AUTH_SECRET` estiver ausente/em fallback dev e se `PII_ENCRYPTION_KEY` faltar fora de `NODE_ENV=development`.
- `npm run typecheck` — checagem TypeScript.
- `npm run test:ci` / `npm run test:coverage` — testes.
- `npm run routes:sync` — inventário/verificação de rotas.
- `npm run routes:verify-security` — validação de guardas de segurança por rota.
- `npm run db:verify` — verificação de drift de schema.
- `npm run seed:demo-tenant` — cria dataset reproduzível de demo/piloto (tenant isolado).

## Segurança e guardrails

- **Isolamento multi-tenant**: `tenantId` em sessão + filtros de query por tenant.
- **Proteção de rotas**: middleware + guards (`requireSession`, `requireSessionTenantMatch`, `requireAdmin`, `requireInternalAuth`).
- **Webhook hardening**: validação de assinatura Twilio/Stripe e idempotência/dedup em webhooks.
- **Proteção de PII**: criptografia AES-GCM e redação em logs/eventos.
- **Rate limiting/circuit breaker**: aplicados em pontos críticos (ex.: entrada WhatsApp e integrações externas).
- **Regra operacional de CI**: `AUTH_SECRET` não pode usar fallback dev e `PII_ENCRYPTION_KEY` é obrigatória fora de `development`.

## Estado atual do produto (baseado no código)

- **Ativo e em uso no código**: atendimento WhatsApp, CRM, frete, pedidos, logística, billing, eventos e camada Frank supervisionada.
- **IA Frank**: existe runtime, tools e worker; operação pode ser restringida por flags (`FRANK_RUNTIME_ENABLED`, `FRANK_RUNTIME_MODE`), permitindo modo supervisionado.
- **Maturidade heterogênea de UI**: há telas e módulos que ainda usam partes mock/placeholder no front-end enquanto o backend já possui estrutura de domínio e schema para os mesmos contextos.

## Documento técnico complementar

Para mapa arquitetural interno e invariantes, veja [`ARCHITECTURE.md`](./ARCHITECTURE.md).
