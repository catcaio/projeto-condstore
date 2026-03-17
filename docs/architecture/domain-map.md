# Domain Map — Condstore OS

> **Última atualização:** 2026-03-17  
> **Escopo:** Classificação oficial dos domínios, nomenclatura e dependências.  
> **Regra:** Este documento reflete o estado real do sistema. Não inclui arquitetura futura.

---

## 1. Propósito

Este documento define **o que cada domínio do sistema é**, onde vive no código, e como se relaciona com os demais. Serve como referência para:

- Decidir onde colocar código novo
- Entender responsabilidades sem ler o fonte
- Impedir criação de módulos duplicados

---

## 2. Domínios Principais

Domínios que implementam a operação core do negócio. Todo novo desenvolvimento orbita estes.

| Domínio | Path Canônico | Responsabilidade | Auth Module |
|---|---|---|---|
| **Atendimento** | `src/modules/atendimento/` | Orquestração WhatsApp inbound, conversation lifecycle, message service, pipeline metrics | `operation` |
| **Clientes** | `src/modules/clientes/` | UI de clientes, customer loader/repository. Cliente 360 com relacionamento e ações | `operation` |
| **Conversas** | `src/modules/conversas/` | UI do inbox WhatsApp (view, hooks, components) | `operation` |
| **Pedidos (Orders)** | `src/modules/orders/` | Order lifecycle completo: service, repository, loader, view. Fluxo CREATED → DELIVERED | `operation` |
| **Freight** | `src/modules/freight/` | Multi-carrier quote engine: carrier-router, table-driven adapter, packing resolver, adapters | `frete` |
| **Logística** | `src/modules/logistica/` | UI logística: fila de acompanhamento, simulações, SLA, exceções | `frete` |
| **Shipping** | `src/modules/shipping/` | Carriers, quote-engine runtimes, simulações server-side | `frete` |
| **Shipments** | `src/modules/shipments/` | Repositories e services de shipments. Linkage order→shipment | `frete` |
| **Frank AI** | `src/modules/frank/` | AI agent operacional: intent resolver, context resolver, tools, orchestrator | `cockpit` |
| **CRM** | `src/modules/crm/` | Pipeline management, CRM services | `operation` |
| **Cockpit** | `src/modules/cockpit/` | Dashboard operacional agregando dados de todos os domínios | `cockpit` |

---

## 3. Domínios de Suporte / Plataforma

Módulos que fornecem capacidades transversais consumidas pelos domínios principais.

| Domínio | Path Canônico | Responsabilidade |
|---|---|---|
| **Auth** | `src/modules/auth/` | Fluxos de autenticação (email, Google OAuth) |
| **Billing** | `src/modules/billing/` | Subscription, checkout (Stripe), plan management |
| **Audit** | `src/modules/audit/` | Trail de auditoria e compliance logging |
| **Privacy** | `src/modules/privacy/` | Utilitários LGPD (purge, anonimização) |
| **Analytics** | `src/modules/analytics/` | Agregação e analytics de eventos |
| **Metrics** | `src/modules/metrics/` | Métricas operacionais, retenção, rollups |
| **Knowledge** | `src/modules/knowledge/` | Knowledge base para AI/RAG (Qdrant) |
| **Governance** | `src/modules/governance/` | Governança operacional, tenant governance |
| **Cotação Pública** | `src/modules/cotacao-publica/` | Engine de cotação pública (LGPD-safe, sem auth) |
| **FinOps** | `src/modules/finops/` | Operações financeiras, cost tracking, reconciliação |
| **Funnel** | `src/modules/funnel/` | Tracking de funil de aquisição |
| **Jobs** | `src/modules/jobs/` | Background jobs (cleanup, backfill, rollup) |
| **Navigation** | `src/modules/navigation/` | Configuração de navegação UI |
| **System Status** | `src/modules/system-status/` | Monitoramento de saúde do sistema |
| **Workspace** | `src/modules/workspace/` | Configuração de workspace/tenant |
| **Timeline** | `src/modules/timeline/` | Timeline de eventos do sistema |
| **Playbooks** | `src/modules/playbooks/` | Playbooks operacionais |
| **Config** | `src/modules/config/` | Configurações de módulos |
| **Catalog** | `src/modules/catalog/` | Catálogo de produtos |
| **Custom Fields** | `src/modules/custom-fields/` | Campos customizados por tenant |

---

## 4. Módulos Transitórios / Sobreposição

Módulos com overlap, mortos ou em convergência. **Não criar código novo nestes módulos.**

| Módulo | Path | Status | Observação |
|---|---|---|---|
| `logistics` | `src/modules/logistics/` | ⚠️ **Ativo (recente)** | Contém `shipment.service.ts`, `shipment.repository.ts`, `shipment.events.ts` e testes. Overlap com `modules/logistica/` (que foca em UI) e `modules/shipments/` (que foca em linkage). Avaliar convergência. |
| `customers` | `src/modules/customers/` | ⚠️ **Sobreposição** | Contém `customer-resolution.service.ts` e `identity-resolver/`. Overlap com `modules/clientes/` (que tem repository + UI). Dívida de convergência. |
| `conversas` vs `atendimento` | Ver paths acima | ⚠️ **Sobreposição** | `conversas/` = UI (view, hooks). `atendimento/` = services (orchestrator, conversation, message). Separação funcional, mas nomes confusos para quem não conhece. |
| `shipping` vs `freight` vs `shipments` | Ver paths acima | ⚠️ **Tríade logística** | `freight/` = quote engine e pricing. `shipping/` = carrier adapters e quote runtime. `shipments/` = persistence e linkage. Funcionam juntos, mas a fronteira não é óbvia. |

> [!IMPORTANT]
> Antes de criar qualquer módulo novo com nome similar aos listados acima, consulte este mapa e valide se o código não pertence a um módulo existente.

---

## 5. Nomenclatura: Regra Atual

**Padrão vigente (tolerado, não ideal):**

| Camada | Idioma | Exemplos |
|---|---|---|
| UI / navegação / páginas | **Português (pt-BR)** | `/pedidos`, `/clientes`, `/conversas`, `/logistica`, `/configuracoes` |
| Módulos técnicos | **Inglês** | `freight`, `shipping`, `auth`, `billing`, `audit`, `crm` |
| Contratos / types / schemas | **Inglês** | `OrderStatus`, `FreightSimulation`, `CustomerContact` |
| Camadas internas (`core/`, `infra/`, `lib/`) | **Inglês** | `circuit-breaker`, `rate-limit`, `idempotency` |

**Regras:**
1. Novos módulos técnicos → **inglês**
2. Novas páginas/rotas UI → **português**  
3. Duplicidades PT+EN para o mesmo conceito = **dívida técnica de convergência** (não criar novas)
4. Código interno (variáveis, funções, tipos) → **sempre inglês**

---

## 6. DOMINE Event Bus

O DOMINE é um **domínio unificado** composto por dois diretórios complementares:

| Path | Papel | Conteúdo |
|---|---|---|
| `src/domine/` | **Engine / Runtime** | `event-bus.ts`, `domine-intake.service.ts`, `capabilities.ts`, `connectors/`, `contracts/`, `events/`, `models/`, `processor/`, `tenant/` |
| `src/modules/domine/` | **Bridge / Facade** | Exposição do DOMINE como módulo consumível pelos demais domínios |

**Não tratar como dois domínios independentes.** O runtime vive em `src/domine/`, e o módulo em `src/modules/domine/` é o ponto de entrada para integração.

### Responsabilidades do DOMINE

- Emissão e ingestão de eventos operacionais assíncronos
- Sanitização de PII antes de persistência
- Processor loop com retry e DLQ (Dead Letter Queue)
- Geração de read models para dashboards
- Contratos de payload tipados

### Eventos conhecidos

`order_created` · `freight_quoted` · `message_received` · `shipment_dispatched` · `customer_created` · `pipeline_stage_changed`

---

## 7. Mapa de Dependência

### Fluxo Quote → Order → Shipment

```
cotacao-publica / freight (quote engine)
    → shipping (carrier adapters)
    → providers/melhorenvio
    → drizzle/schema (freight_simulations)
        ↓
orders (order.service)
    → shipments (linkage repository)
    → drizzle/schema (orders, order_items, freight_shipments)
        ↓
domine/event-bus (order_created, freight_quoted)
    → cockpit (dashboards, read models)
```

### Fluxo WhatsApp Inbound

```
api/whatsapp/incoming (Twilio webhook)
    → atendimento (whatsapp-inbound-orchestrator)
    → customers (identity-resolver)
    → frank (intent-resolver → context-resolver → tools)
    → atendimento (conversation.service, message.service)
    → domine/event-bus (message_received)
    → conversas (UI inbox)
```

### Fluxo CRM Pipeline

```
atendimento (conversation.service)
    → crm (pipeline management)
    → atendimento (pipeline-metrics.service)
    → clientes (customer.repository)
```

### Infraestrutura compartilhada (todos os domínios)

```
infra/auth     — session, guards
infra/db       — drizzle client
infra/redis    — cache, rate-limit
infra/logger   — structured logging com PII redaction
infra/pii      — encryption (AES-256-GCM), hashing
infra/security — HMAC, signatures
middleware.ts  — JWT, RBAC, header injection
```
