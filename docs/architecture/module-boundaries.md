# Module Boundaries — Condstore OS

> **Última atualização:** 2026-03-17  
> **Escopo:** Regras de fronteira, hierarquia de camadas e anatomia de módulos.  
> **Regra:** Este documento define o que é permitido e proibido entre camadas. Toda importação deve respeitar estas fronteiras.

---

## 1. Propósito

Este documento define:

- O que é um módulo e o que não é
- Que camada pode importar de qual outra
- O que um módulo pode e não pode acessar de outro módulo
- Onde vivem as preocupações transversais

---

## 2. Camadas do Sistema

```
┌─────────────────────────────────────────────┐
│  src/app/              ← Presentation       │
│  (pages, layouts, API routes)               │
├─────────────────────────────────────────────┤
│  src/modules/          ← Domain             │
│  (business logic, services, repositories)   │
├─────────────────────────────────────────────┤
│  src/core/             ← Cross-cutting      │
│  (contratos, políticas, config transversal) │
├─────────────────────────────────────────────┤
│  src/infra/            ← Infrastructure     │
│  (db, redis, auth, crypto, logger, PII)     │
├─────────────────────────────────────────────┤
│  src/lib/              ← Utilities          │
│  (formatters, validators, helpers puros)    │
├─────────────────────────────────────────────┤
│  src/domine/           ← Event Engine       │
│  (event bus, processor, contracts, DLQ)     │
└─────────────────────────────────────────────┘
```

### Camadas auxiliares

| Camada | Path | Papel |
|---|---|---|
| UI Components | `src/ui/` | Componentes visuais reutilizáveis (design system, shell, theme) |
| Components | `src/components/` | Componentes de apresentação compartilhados |
| Config | `src/config/` | Configuração da aplicação (modules, RBAC, plans, flags) |
| Providers | `src/providers/` | Adapters para serviços externos (Twilio, Melhor Envio) |
| Workers | `src/workers/` | Background workers (finops, knowledge, queue, webhook) |
| Services (cross) | `src/services/` | Serviços cross-cutting (events, metrics, notifications, queue, search, workflow) |
| Types | `src/types/` | Tipos globais compartilhados |
| DB | `src/db/` | Client e config do banco de dados |
| Drizzle | `src/drizzle/` | Schema, migrations, seeds |
| Legacy | `src/legacy/` | Código legado em deprecação |

---

## 3. Regras de Dependência entre Camadas

**Direção permitida: de cima para baixo.** Camadas superiores importam das inferiores. Nunca o contrário.

```
app/ ──────→ modules/ ──────→ core/ ──────→ infra/ ──────→ lib/
  │              │               │              │
  │              │               │              └──→ drizzle/
  │              │               │
  │              └──────────────→ domine/ (event engine)
  │
  └──→ ui/ (componentes visuais)
  └──→ config/ (configuração da app)
```

### Regras explícitas

| Regra | Permitido | Proibido |
|---|---|---|
| `app/` importa de `modules/` | ✅ | — |
| `app/` importa de `infra/` | ✅ (guards, session) | — |
| `modules/` importa de `modules/` | ✅ (ver restrições abaixo) | Importação circular |
| `modules/` importa de `core/` | ✅ | — |
| `modules/` importa de `infra/` | ✅ | — |
| `modules/` importa de `app/` | — | ⛔ Proibido |
| `core/` importa de `modules/` | — | ⛔ Proibido |
| `core/` importa de `infra/` | ✅ | — |
| `infra/` importa de `modules/` | — | ⛔ Proibido |
| `infra/` importa de `core/` | — | ⛔ Proibido |
| `lib/` importa de qualquer camada acima | — | ⛔ Proibido (lib é folha) |
| `providers/` importa de `infra/` | ✅ | — |
| `providers/` importa de `modules/` | — | ⛔ Proibido |
| `workers/` importa de `modules/` e `infra/` | ✅ | — |

### Importação entre módulos

Um módulo **pode** importar de outro módulo, com estas restrições:

1. Apenas via **exports públicos** (index.ts ou arquivos de serviço raiz)
2. **Nunca** importar componentes internos (`_components/`, `components/` internos)
3. **Nunca** importar repositórios de outro módulo diretamente — usar o service
4. Importações circulares entre módulos = **bug arquitetural**

---

## 4. Anatomia de um Módulo

Estrutura interna esperada para um módulo em `src/modules/`:

```
src/modules/{nome}/
├── index.ts                  ← Export público (obrigatório se módulo é importado por outros)
├── {nome}.service.ts         ← Lógica de negócio principal
├── {nome}.repository.ts      ← Acesso a dados (Drizzle queries)
├── types.ts                  ← Tipos e interfaces do domínio
├── actions/                  ← Server Actions (Next.js)
├── components/               ← Componentes UI específicos do módulo
├── {nome}-view.tsx           ← View principal (page-level component)
├── mock-data.ts              ← Dados de mock para desenvolvimento
├── __tests__/                ← Testes unitários e de integração
├── events/                   ← Definições de eventos do domínio (opcional)
└── loader.ts                 ← Data loader para SSR (opcional)
```

**Nem todos os módulos têm todas estas partes.** Módulos técnicos (ex: `auth`, `audit`) tipicamente não têm `components/` ou `*-view.tsx`. Módulos de UI (ex: `logistica`, `conversas`) tipicamente não têm `repository.ts` próprio.

---

## 5. Fronteiras de Importação

### O que um módulo PODE acessar

| Acesso | Exemplo |
|---|---|
| Service de outro módulo | `import { OrderService } from '@/modules/orders'` |
| Types de outro módulo | `import type { Order } from '@/modules/orders/types'` |
| Infra compartilhada | `import { db } from '@/infra/db'` |
| Core contracts | `import { requireSessionTenantMatch } from '@/core/...'` |
| Lib utilities | `import { formatPhone } from '@/lib/phone'` |
| DOMINE event bus | `import { emitEvent } from '@/domine/event-bus'` |

### O que um módulo NÃO PODE acessar

| Proibido | Motivo |
|---|---|
| Repository de outro módulo | Quebra encapsulamento — usar o service |
| Componentes internos de outro módulo | Acoplamento de UI — extrair para `src/ui/` se precisa compartilhar |
| `src/app/` routes ou pages | Inversão de dependência |
| Provider diretamente | Usar via service ou infra — providers são detalhes de implementação |
| `src/legacy/` | Código em deprecação — não criar novas dependências |

---

## 6. Camadas Transversais

### `src/core/` — Contratos e Políticas

Contém **contratos e políticas** que atravessam domínios. Não contém implementação de infraestrutura.

| Subsistema | Conteúdo |
|---|---|
| `core/ai/` | Contratos de AI (modelos, prompts) |
| `core/config/` | Runtime config, env validation, internal token, data retention |
| `core/conversation/` | Contratos de conversation cross-module |
| `core/events/` | Contratos de eventos (tipos, enums compartilhados) |
| `core/freight/` | Contratos de freight (tipos compartilhados entre freight/shipping/shipments) |
| `core/mesh/` | Service mesh contracts |
| `core/stripe/` | Contratos e wrappers Stripe |
| `core/supreme/` | Contratos do Supreme (AI governance) |

### `src/infra/` — Implementações Técnicas

Contém **implementações técnicas** concretas. Código que fala com banco, Redis, providers externos.

| Subsistema | Responsabilidade |
|---|---|
| `infra/auth/` | Session management, password hashing, JWT |
| `infra/db.ts` | Drizzle client connection |
| `infra/redis.client.ts` | Redis connection e helpers |
| `infra/logger.ts` | Structured logger com PII redaction |
| `infra/pii/` | AES-256-GCM encryption, phone hashing |
| `infra/security/` | HMAC, signature verification |
| `infra/circuit-breaker.ts` | Circuit breaker implementation |
| `infra/rate-limit/` | Rate limiting (Redis-backed) |
| `infra/idempotency/` | Idempotency key management |
| `infra/events/` | Event emission infrastructure |
| `infra/repositories/` | Repositories compartilhados |
| `infra/diagnostics/` | Health checks, system diagnostics |
| `infra/observability/` | Tracing, metrics collection |
| `infra/http/` | Request trace, HTTP helpers |
| `infra/jobs/` | Job scheduling infrastructure |

### `src/lib/` — Utilitários Puros

Contém **funções utilitárias sem side effects**. Não depende de nenhuma camada superior.

Exemplos: `lib/phone` (formatação), `lib/formatters/`, `lib/validation.ts`, `lib/hash.ts`, `lib/normalize.ts`.

**Regra:** `lib/` nunca importa de `app/`, `modules/`, `core/`, ou `infra/`. É folha do grafo de dependências.

---

## 7. Providers e Workers

### `src/providers/` — Adapters Externos

| Provider | Responsabilidade |
|---|---|
| `twilio.provider.ts` | Adapter para Twilio (WhatsApp messaging) |
| `melhorenvio.provider.ts` | Adapter para Melhor Envio (carrier API) |

**Regras:**
- Providers importam apenas de `infra/` e `lib/`
- Módulos consomem providers via services, nunca diretamente
- Cada provider encapsula **um único** serviço externo

### `src/workers/` — Background Workers

| Worker | Responsabilidade |
|---|---|
| `finops-worker.ts` | Processamento financeiro contínuo |
| `knowledge-ingest.ts` | Ingestão de documentos para knowledge base |
| `knowledge-sync.ts` | Sincronização de knowledge base |
| `queue-worker.ts` | Processamento de fila genérica |
| `quote-worker.ts` | Processamento assíncrono de cotações |
| `webhook-worker.ts` | Processamento de webhooks |

**Regras:**
- Workers importam de `modules/` e `infra/`
- Workers rodam como processos separados (não dentro do Next.js runtime)
- Workers são idempotentes — reprocessar o mesmo item não causa efeito colateral
