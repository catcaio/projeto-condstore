# App Structure — Condstore OS

> **Última atualização:** 2026-03-17  
> **Escopo:** Organização do Next.js App Router, route groups, API routes e navegação.  
> **Regra:** Este documento reflete a estrutura real. Novas páginas seguem as regras aqui definidas.

---

## 1. Propósito

Define como `src/app/` está organizado, o que cada route group faz, onde ficam as API routes, e como registrar novas páginas no sistema de navegação.

---

## 2. Route Groups

O Next.js App Router usa **route groups** `(nome)` para agrupar páginas sob layouts diferentes sem afetar a URL.

| Group | Path | Escopo | Layout | Auth |
|---|---|---|---|---|
| `(app)` | `src/app/(app)/` | App autenticada principal | Sidebar + CommandBar | **Obrigatório** (session cookie) |
| `(public)` | `src/app/(public)/` | Site público, marketing, landing pages | Layout público (navbar + footer) | Nenhuma |
| `(admin)` | `src/app/(admin)/` | Overlay admin sobre cockpit | Herda de (app) | Admin-only |
| `(cockpit)` | `src/app/(cockpit)/` | Overlay cockpit (logística) | Herda de (app) | Session + role |
| `(field)` | `src/app/(field)/` | Field ops (tech) | Próprio | Session |
| `(marketing)` | `src/app/(marketing)/` | Concept layer / preview marketing | Próprio | Nenhuma |

### Regra de uso

- **Novas páginas autenticadas** → `(app)/`
- **Novas páginas públicas** → `(public)/`
- **Não criar novos route groups** sem justificativa explícita

---

## 3. Páginas da App Autenticada `(app)/`

| Área | Path | Módulo de Suporte | Nav Group |
|---|---|---|---|
| **Cockpit** | `/cockpit` | `modules/cockpit` | Core |
| **Conversas** | `/conversas` | `modules/conversas` + `modules/atendimento` | Core |
| **Pedidos** | `/pedidos` | `modules/orders` | Core |
| **Logística** | `/logistica` | `modules/logistica` + `modules/freight` | Core |
| **Clientes** | `/clientes` | `modules/clientes` + `modules/customers` | Core |
| **Frank** | `/frank` | `modules/frank` | Inteligência |
| **Métricas** | `/metricas` | `modules/metrics` + `modules/analytics` | Inteligência |
| **Tenant** | `/tenant` | `modules/workspace` | Governança |
| **Configurações** | `/configuracoes` | `modules/config` + `modules/auth` | Governança |
| **Operação** | `/operacao` | `modules/cockpit` | Governança |
| **Attribution** | `/attribution` | `modules/analytics` | — |
| **Dashboard** | `/dashboard` | `modules/cockpit` (redirect to `/cockpit`) | — |
| **Home** | `/home` | `modules/cockpit` (redirect to `/cockpit`) | — |
| **Financeiro** | `/financeiro` | `modules/finops` | Legacy |
| **Freight** | `/freight` | `modules/freight` | — |
| **Inbox** | `/inbox` | `modules/conversas` (alias de `/conversas`) | — |
| **Settings** | `/settings` | Legacy settings | Legacy |
| **Sistema** | `/sistema` | `modules/system-status` | Legacy |
| **Supreme** | `/supreme` | `core/supreme` | Legacy |
| **Vendas** | `/vendas` | Legacy sales | Legacy |

### Cockpit Sub-pages (`/cockpit/*`)

O cockpit contém 37 subdiretórios incluindo áreas legacy:

| Área | Path | Status |
|---|---|---|
| `acquisition/` | `/cockpit/acquisition` | Legacy (navVisible: false) |
| `analytics/` | `/cockpit/analytics` | Legacy |
| `atendimento/` | `/cockpit/atendimento` | Ativo |
| `audit/` | `/cockpit/audit` | Legacy |
| `carrier-tables/` | `/cockpit/carrier-tables` | Legacy |
| `configuracoes/` | `/cockpit/configuracoes` | Ativo |
| `deliveries/` | `/cockpit/deliveries` | Legacy |
| `domine/` | `/cockpit/domine` | Legacy |
| `equipe/` | `/cockpit/equipe` | Legacy |
| `finops/` | `/cockpit/finops` | Ativo |
| `frank/` | `/cockpit/frank` | Ativo |
| `knowledge/` | `/cockpit/knowledge` | Legacy |
| `metrics/` | `/cockpit/metrics` | Ativo |
| `orders/` | `/cockpit/orders` | Ativo |
| `pipeline/` | `/cockpit/pipeline` | Ativo |
| `privacy/` | `/cockpit/privacy` | Ativo |
| `rate-limit/` | `/cockpit/rate-limit` | Legacy |
| `security/` | `/cockpit/security` | Ativo |
| `settings/` | `/cockpit/settings` | Ativo |
| `shipments/` | `/cockpit/shipments` | Ativo |
| `status/` | `/cockpit/status` | Ativo |
| `supreme/` | `/cockpit/supreme` | Ativo |
| `timeline/` | `/cockpit/timeline` | Ativo |

> [!NOTE]
> Sub-pages marcadas como "Legacy" têm `navVisible: false` em `config/modules.ts`. Continuam acessíveis via URL direta mas não aparecem na navegação principal.

---

## 4. API Routes

### Classificação

As API routes seguem 5 padrões de autenticação e escopo:

| Classificação | Prefixo | Auth | Exemplos |
|---|---|---|---|
| **Public** | `/api/public/*` | Nenhuma | `/api/public/cotacao/quotes`, `/api/public/events` |
| **Cockpit** | `/api/cockpit/*` | Session cookie (any role) | `/api/cockpit/metrics`, `/api/cockpit/analytics/*` |
| **Internal** | `/api/internal/*` | Internal token (`INTERNAL_API_TOKEN`) | `/api/internal/diag`, `/api/internal/jobs/*` |
| **Tenant-scoped** | `/api/tenants/[tenantId]/*` | Session cookie + tenant match | `/api/tenants/[tenantId]/settings`, `/api/tenants/[tenantId]/domine/*` |
| **Webhook** | `/api/webhook/*` | Signature verification | `/api/webhook/stripe` (Stripe sig), `/api/whatsapp/*` (Twilio sig) |

### Organização de diretórios (`src/app/api/`)

```
api/
├── app/               ← App-level events
├── auth/              ← login, logout, me, seed-admin
├── billing/           ← subscription management
├── checkout/          ← Stripe checkout
├── cockpit/           ← Dashboard APIs (metrics, analytics, audit, finops, ...)
├── cron/              ← Scheduled jobs (cleanup)
├── db/                ← Database operations (migrate)
├── debug/             ← Debug endpoints (dev-only)
├── domine/            ← DOMINE event APIs
├── ecosystem/         ← Ecosystem events
├── events/            ← Event ingestion
├── freight/           ← Freight simulation APIs
├── health/            ← Health check
├── history/           ← History APIs
├── internal/          ← Internal-only APIs (jobs, health, diag, QA)
├── knowledge/         ← Knowledge base APIs
├── metrics/           ← Metrics APIs
├── notifications/     ← Notification APIs
├── orders/            ← Order management APIs
├── painel-logistico/  ← Legacy logistics panel API
├── public/            ← Public APIs (cotação, events)
├── reports/           ← Report APIs
├── sales/             ← Sales APIs
├── search/            ← Search APIs
├── simulate/          ← Simulation API
├── supreme/           ← Supreme AI APIs
├── tenants/           ← Tenant-scoped APIs
├── webhook/           ← Webhook receivers (Stripe)
├── webhooks/          ← ⚠️ Duplicata legacy de webhook/ (Stripe)
└── whatsapp/          ← WhatsApp webhook (Twilio)
```

> [!WARNING]
> `api/webhook/` e `api/webhooks/` coexistem. Ambos contém rota Stripe. Não criar novas rotas em `api/webhooks/` — usar `api/webhook/`.

---

## 5. Rotas Standalone

Páginas fora de route groups com justificativa:

| Rota | Path | Motivo |
|---|---|---|
| `/login` | `src/app/login/` | Página pública de auth — não pertence a `(app)` nem `(public)` |
| `/signup` | `src/app/signup/` | Página pública de registro |
| `/billing` | `src/app/billing/` | Fluxo de billing (manage, success) — opera fora do layout app |
| `/evolution` | `src/app/evolution/` | Roadmap/evolution — standalone |
| `/painel-logistico` | `src/app/painel-logistico/` | Legacy logistics panel — candidato a remoção |
| `/t/[token]` | `src/app/t/` | Token-based access (links compartilháveis) |

**Regra:** Não criar novas rotas standalone. Novas páginas autenticadas vão em `(app)/`, públicas em `(public)/`.

---

## 6. Navegação

### Foundation vs Legacy (`src/config/modules.ts`)

O sistema de navegação é controlado por `src/config/modules.ts` com dois grupos:

**FOUNDATION_MODULES** (10 módulos — navegação principal visível):

| ID | Label | Nav Group | Ordem |
|---|---|---|---|
| `cockpit` | Cockpit | Core | 10 |
| `conversas` | Conversas | Core | 20 |
| `pedidos` | Pedidos | Core | 30 |
| `logistica` | Logística | Core | 40 |
| `clientes` | Clientes | Core | 50 |
| `frank` | Frank | Inteligência | 70 |
| `metricas` | Métricas | Inteligência | 80 |
| `tenant` | Tenant | Governança | 90 |
| `configuracoes` | Configurações | Governança | 100 |
| `operacao` | Operação | Governança | 110 |

**LEGACY_MODULES** (20 módulos — `navVisible: false`):

Rotas que continuam funcionais mas foram removidas da navegação principal. Incluem: analytics, audit, acquisition, freight-hub, packing-profiles, carrier-tables, deliveries, domine, knowledge, equipe, rate-limit, settings, finance, tenants, dispatch, technicians, routes, events, sales, financeiro, sistema, supreme, cockpit-legacy.

### Nav Groups

```
Core           → Cockpit, Conversas, Pedidos, Logística, Clientes
Inteligência   → Frank, Métricas
Governança     → Tenant, Configurações, Operação
```

---

## 7. Regras de Criação de Novas Páginas

### Checklist obrigatório

1. **Definir route group**: `(app)/` para autenticada, `(public)/` para pública
2. **Criar diretório**: `src/app/(grupo)/nome-da-pagina/page.tsx`
3. **Registrar em `config/modules.ts`**: Adicionar à lista `FOUNDATION_MODULES` se visível na nav, ou `LEGACY_MODULES` se hidden
4. **Definir routes**: Listar todos os padrões de URL no campo `routes`
5. **Definir auth**: Especificar `authModule` e `requiredRoles`
6. **Registrar em `docs/routes-registry.md`**: Obrigatório — CI bloqueia rotas não registradas
7. **Mapear módulo de suporte**: Qual `src/modules/` fornece os dados

### Nomes de rota

- Rotas UI → **português** (ex: `/pedidos`, `/clientes`, `/financeiro`)
- Rotas API → **inglês** (ex: `/api/orders`, `/api/freight`, `/api/billing`)
- Slugs compostos → **kebab-case** (ex: `/cotacao-publica`, `/painel-logistico`)
