# Implementation Rules — Condstore OS

> **Última atualização:** 2026-03-17  
> **Escopo:** Regras operacionais obrigatórias para qualquer implementação no sistema.  
> **Regra:** Toda PR deve respeitar estas regras. Violações bloqueiam merge.

---

## 1. Propósito

Este documento lista as regras de implementação que todo desenvolvedor deve seguir. Não é guia de estilo — é conjunto de restrições obrigatórias que protegem a integridade do sistema.

---

## 2. Regras de Módulo

### Criação de módulo novo

1. Consultar `domain-map.md` antes de criar — confirmar que o domínio não existe
2. Path: `src/modules/{nome}/`
3. Nome: inglês para módulos técnicos, português para módulos de UI/navegação
4. Estrutura mínima: `index.ts` + `types.ts` + pelo menos um service ou view
5. Registrar no `domain-map.md` com classificação (principal / suporte / transitório)

### Dentro de um módulo

1. **Service** encapsula lógica de negócio — é o ponto de entrada para outros módulos
2. **Repository** encapsula queries Drizzle — nunca expor repository para outros módulos
3. **Types** define interfaces do domínio — pode ser importado por outros módulos
4. **Actions** são Server Actions do Next.js — vivem em `actions/`
5. **Components** são UI específica do módulo — não compartilhar diretamente (extrair para `src/ui/` se precisar)

### Proibições de módulo

- Não importar repository de outro módulo → usar service
- Não importar componentes internos de outro módulo → extrair para `src/ui/`
- Não criar módulo com nome duplicado em outro idioma (ver dívidas de convergência no `domain-map.md`)
- Não colocar lógica de negócio em `src/app/` → mover para `src/modules/`

---

## 3. Regras de API Route

### Guards obrigatórios

Toda API route deve usar **exatamente um** guard:

| Tipo de rota | Guard | Import |
|---|---|---|
| Rota autenticada padrão | `requireSessionTenantMatch(req)` | `@/core/...` |
| Rota admin-only | `requireAdmin(req)` | `@/core/...` |
| Rota interna/service | `requireInternalAuth(req)` ou `requireInternalToken(req)` | `@/core/config/internal-token` |
| Rota com plano ativo | `requireActivePlan(req)` | `@/core/...` |
| Rota pública | Nenhum guard, mas **rate limiting obrigatório** | `@/infra/rate-limit/` |
| Webhook | Signature verification (Stripe/Twilio/HMAC) | Provider-specific |

**Sem exceções.** Rota sem guard = vulnerabilidade.

### Tenant isolation

1. `tenantId` **nunca** vem do request body ou query params
2. `tenantId` é extraído do JWT via middleware (`x-tenant-id` header)
3. Toda query ao banco filtra por `tenantId`
4. Todo cache key inclui `tenantId` como namespace

### Padrão de response

```typescript
// Sucesso
return NextResponse.json({ data: result }, { status: 200 });

// Erro controlado
return NextResponse.json({ error: "mensagem" }, { status: 4xx });

// Erro interno
return NextResponse.json({ error: "Internal server error" }, { status: 500 });
```

- Nunca retornar stack traces em produção
- Nunca retornar dados PII em mensagens de erro
- Sempre logar o erro completo via `infra/logger`

### Registro obrigatório

Toda nova rota deve ser registrada em `docs/routes-registry.md`. CI bloqueia rotas não registradas.

---

## 4. Regras de Dados

### Schema (Drizzle)

1. Toda tabela tem coluna `tenant_id` (exceto tabelas de sistema como `users`)
2. Toda query filtra por `tenant_id` — sem exceção
3. Mudanças no schema exigem migration via `drizzle-kit generate`
4. Testar migration localmente antes de abrir PR
5. Schema vive em `src/drizzle/schema.ts` — arquivo único

### PII

1. Telefone: armazenado como `phone_hash` (SHA-256+HMAC) + `phone_last4`
2. Telefone cru: encriptado com AES-256-GCM via `PII_ENCRYPTION_KEY`
3. Email: never stored in plaintext in operational tables
4. Logs: structured logger auto-redact campos sensíveis
5. Eventos: sanitização PII automática no Event Bus antes de persistir

### tenantId

1. Derivado do JWT (session cookie) — nunca aceito de request body
2. Propagado via headers pelo middleware (`x-tenant-id`)
3. Passado explicitamente para services e repositories
4. Usado como namespace em cache keys Redis

---

## 5. Regras de Evento (DOMINE)

### Quando usar

- **DOMINE (assíncrono)**: Notificações, auditoria, métricas, read model updates, side effects que não afetam o response
- **Chamada direta (síncrono)**: Operações que o usuário espera ver no response imediato (ex: criar pedido, salvar contato)

### Como emitir

```typescript
import { emitEvent } from '@/domine/event-bus';

await emitEvent({
  type: 'order_created',
  tenantId,
  payload: { orderId, customerId },
  actor: userId,
});
```

### Regras

1. Todo evento tem `type`, `tenantId`, `payload`, `actor`, `timestamp`
2. Payload **nunca** contém PII diretamente — Event Bus sanitiza automaticamente, mas não confiar apenas nisso
3. Eventos são idempotentes — reprocessar não causa duplicação
4. Eventos que falham vão para DLQ — monitorar via `/cockpit/domine/dlq`
5. Novos tipos de evento devem ser registrados em `src/domine/contracts/`

---

## 6. Regras de UI

### Server vs Client Components

| Tipo | Uso | Marcação |
|---|---|---|
| **Server Component** | Layouts, pages, data fetching | Padrão (sem marcação) |
| **Client Component** | Interatividade, hooks, state | `'use client'` no topo do arquivo |

### Regras

1. Layouts (`layout.tsx`) são **sempre** Server Components
2. `'use client'` apenas onde necessário (click handlers, useState, useEffect)
3. Componentes presentacionais puros (sem hooks) não precisam de `'use client'` — renderizam no client boundary do pai
4. Data fetching pesado: fazer no server (loader ou page.tsx), passar como props

### Onde colocar componentes

| Escopo | Local |
|---|---|
| Específico de um módulo | `src/modules/{módulo}/components/` |
| Específico de uma página cockpit | `src/app/(app)/cockpit/_components/` |
| Compartilhado entre módulos | `src/ui/` (dentro do pacote semântico correto) |
| Design system base | `src/ui/foundation/` ou `src/ui/tokens/` |

### Proibições UI

- Não colocar lógica de negócio em componentes — chamar services
- Não fazer fetch diretamente de componentes para banco — usar API routes ou Server Actions
- Não compartilhar componentes entre módulos via import direto — extrair para `src/ui/`

---

## 7. Regras de Segurança

### Middleware (`src/middleware.ts`)

1. Todo request não-público passa por JWT verification
2. Headers injetados pelo middleware: `x-user-id`, `x-user-email`, `x-tenant-id`, `x-user-role`
3. RBAC: primeiro match ganha (rules avaliadas top-to-bottom)
4. Request ID: `x-request-id` injetado em todo request para tracing

### Webhooks

1. **Stripe**: `stripe.webhooks.constructEvent` — verificar assinatura antes de processar
2. **Twilio**: `verifyTwilioSignature` — verificar header antes de processar
3. **DOMINE intake**: HMAC-SHA256 signature verification
4. **Todos**: Deduplicação + idempotency obrigatórios

### Secrets

1. `AUTH_SECRET`: Chave HS256 para JWT. Em produção, obrigatório — boot falha sem ela
2. `PII_ENCRYPTION_KEY`: Chave AES-256-GCM. Em produção, obrigatório
3. `INTERNAL_DIAG_TOKEN` / `INTERNAL_EXPORT_TOKEN` / `INTERNAL_JOB_TOKEN`: tokens oficiais por propósito para rotas internal. `INTERNAL_TOKEN` é apenas alias legado para jobs. Validação fail-closed
4. Secrets nunca logados — logger auto-redact

### Rate Limiting

1. Rotas públicas: rate limit obrigatório
2. Em produção: Redis-backed (fail-closed sem Redis)
3. Em desenvolvimento: in-memory fallback permitido

---

## 8. Proibições Explícitas

Lista do que **nunca** fazer, independente do motivo:

| # | Proibição | Motivo |
|---|---|---|
| 1 | Aceitar `tenantId` do request body | Quebra isolamento multi-tenant |
| 2 | Criar API route sem guard | Vulnerabilidade de segurança |
| 3 | Armazenar PII em plaintext | Violação LGPD |
| 4 | Importar de `src/app/` dentro de `src/modules/` | Inversão de dependência |
| 5 | Criar módulo com nome duplicado em outro idioma | Agravar dívida de convergência |
| 6 | Logar dados sensíveis (phone, email, token, cookie, password) | Vazamento de PII |
| 7 | Retornar stack trace em response de produção | Information disclosure |
| 8 | Criar rota sem registrar em `docs/routes-registry.md` | CI bloqueia |
| 9 | Ignorar DLQ do DOMINE | Perda silenciosa de eventos |
| 10 | Criar novas dependências em `src/legacy/` | Código em deprecação |
| 11 | Criar rotas em `api/webhooks/` (com s) | Usar `api/webhook/` (sem s) |
| 12 | Skipar PII sanitization em eventos | DOMINE sanitiza, mas código emissor deve ser consciente |
