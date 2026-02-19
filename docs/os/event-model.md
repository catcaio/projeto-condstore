# Condstore OS — Modelo de Eventos e Auditoria

> **Status:** Modelo v0.1 — scaffolding. Sem implementação de event store real.

## Princípios

- **Imutabilidade:** Eventos são append-only. Nunca deletar, nunca atualizar.
- **Completude:** Toda ação observável produz um evento.
- **Auditabilidade:** Eventos são suficientes para reconstruir o estado.
- **PII-safe:** Dados pessoais são mascarados antes do log.
- **Correlação:** Todos os eventos de um fluxo compartilham `correlation_id`.

---

## Estrutura Base do Evento

```typescript
interface BaseEvent {
  /** ID único do evento (UUIDv4) */
  event_id: string;

  /** Tipo do evento (snake_case, namespace com ponto) */
  type: EventType;

  /** Timestamp de criação (ISO 8601 UTC) */
  occurred_at: string;

  /** Identificadores de rastreamento */
  tenant_id: string;
  session_id?: string;
  correlation_id: string;  // agrupa eventos de um mesmo fluxo
  causation_id?: string;   // event_id que causou este evento

  /** Versão do schema do evento */
  schema_version: 1;

  /** Payload específico do evento */
  payload: Record<string, unknown>;
}
```

---

## Catálogo de Eventos

### Domínio: Conversa (`conversation.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `conversation.started` | Nova sessão criada | `phone_masked`, `channel` |
| `conversation.intent_classified` | Intent detectada | `intent`, `confidence`, `method` |
| `conversation.state_changed` | Transição de estado | `from_state`, `to_state`, `trigger` |
| `conversation.reset` | Usuário ou timeout resetou | `reason` |
| `conversation.ended` | Sessão expirada | `duration_ms`, `total_messages` |

### Domínio: LLM (`llm.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `llm.input_received` | Input enviado ao LLM | `intent_hint`, `token_count` |
| `llm.output_parsed` | Output validado com sucesso | `intent`, `tool`, `confidence` |
| `llm.schema_error` | Output inválido | `errors`, `raw_output_truncated` |
| `llm.injection_blocked` | Injection detectada | `pattern_matched`, `input_truncated` |
| `llm.rate_limit_hit` | Rate limit atingido | `window`, `count`, `limit` |

### Domínio: Tool (`tool.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `tool.called` | Tool prestes a ser executada | `tool_name`, `args_schema` |
| `tool.blocked` | Tool não está na allowlist | `tool_name`, `requested_by` |
| `tool.success` | Tool executou com sucesso | `tool_name`, `duration_ms` |
| `tool.error` | Tool falhou | `tool_name`, `error_code`, `duration_ms` |
| `tool.timeout` | Tool excedeu timeout | `tool_name`, `timeout_ms` |

### Domínio: Provider (`provider.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `provider.called` | Chamada iniciada | `provider`, `operation` |
| `provider.success` | Resposta recebida | `provider`, `duration_ms`, `cache_hit` |
| `provider.error` | Falha na integração | `provider`, `error_code`, `status_code` |
| `provider.fallback_used` | Fallback ativado | `primary`, `fallback`, `reason` |
| `provider.circuit_open` | Circuit breaker aberto | `provider`, `failure_count` |

### Domínio: Mensagem (`message.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `message.received` | Mensagem do usuário chegou | `channel`, `direction: "inbound"` |
| `message.sent` | Resposta enviada | `channel`, `direction: "outbound"`, `template_id` |
| `message.failed` | Envio falhou | `channel`, `error_code` |

### Domínio: Autenticação (`auth.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `auth.login_success` | Login bem-sucedido | `user_id`, `ip_masked` |
| `auth.login_failed` | Credenciais inválidas | `email_masked`, `ip_masked` |
| `auth.logout` | Logout explícito | `user_id` |
| `auth.token_expired` | Sessão expirada | `user_id` |

### Domínio: Sistema (`system.*`)

| Tipo | Quando ocorre | Payload relevante |
|------|---------------|-------------------|
| `system.startup` | Servidor iniciado | `version`, `env` |
| `system.health_check` | Health check executado | `status`, `checks` |
| `system.config_loaded` | Configuração carregada | `tenant_id`, `keys_count` |

---

## Tipo Union de Todos os Eventos

```typescript
export type EventType =
  // Conversa
  | "conversation.started"
  | "conversation.intent_classified"
  | "conversation.state_changed"
  | "conversation.reset"
  | "conversation.ended"
  // LLM
  | "llm.input_received"
  | "llm.output_parsed"
  | "llm.schema_error"
  | "llm.injection_blocked"
  | "llm.rate_limit_hit"
  // Tool
  | "tool.called"
  | "tool.blocked"
  | "tool.success"
  | "tool.error"
  | "tool.timeout"
  // Provider
  | "provider.called"
  | "provider.success"
  | "provider.error"
  | "provider.fallback_used"
  | "provider.circuit_open"
  // Mensagem
  | "message.received"
  | "message.sent"
  | "message.failed"
  // Auth
  | "auth.login_success"
  | "auth.login_failed"
  | "auth.logout"
  | "auth.token_expired"
  // Sistema
  | "system.startup"
  | "system.health_check"
  | "system.config_loaded";
```

---

## Interface do Event Store

```typescript
// src/infra/event-store.interface.ts

export interface IEventStore {
  /**
   * Persiste um evento. Operação deve ser atômica.
   * Nunca lança — retorna false em caso de falha.
   */
  append(event: BaseEvent): Promise<boolean>;

  /**
   * Recupera eventos por correlation_id.
   */
  getByCorrelation(correlationId: string): Promise<BaseEvent[]>;

  /**
   * Recupera eventos de uma sessão, paginados.
   */
  getBySession(
    sessionId: string,
    opts?: { limit?: number; before?: string }
  ): Promise<BaseEvent[]>;

  /**
   * Recupera eventos de um tenant em um intervalo.
   */
  getByTenant(
    tenantId: string,
    opts: { from: string; to: string; types?: EventType[] }
  ): Promise<BaseEvent[]>;
}
```

---

## Rastreamento e Correlação

```
Mensagem recebida (message_id: msg_abc)
│
├─ correlation_id: corr_xyz  ← gerado no webhook
│
├─ conversation.started     { correlation_id: corr_xyz }
├─ llm.input_received       { correlation_id: corr_xyz, causation_id: msg_abc }
├─ llm.output_parsed        { correlation_id: corr_xyz }
├─ tool.called              { correlation_id: corr_xyz }
│   └─ provider.called      { correlation_id: corr_xyz, causation_id: tool_id }
│   └─ provider.success     { correlation_id: corr_xyz }
├─ tool.success             { correlation_id: corr_xyz }
└─ message.sent             { correlation_id: corr_xyz }
```

**Regra:** O `correlation_id` é gerado no ponto de entrada (webhook, API) e propagado por toda a cadeia de chamadas.

---

## Retenção e Privacidade

| Dado | Retenção | Mascaramento |
|------|----------|--------------|
| Payload de eventos | 90 dias | PII mascarado (ver `maskPII()`) |
| Logs de sistema | 30 dias | Sem dados de usuário |
| Audit trail auth | 1 ano | Email mascarado, IP mascarado |
| Raw messages | 30 dias | Apenas referência ao `message_id` |

---

## Notas de Implementação

1. **Event Store inicial:** A tabela `messages` existente em `src/drizzle/schema.ts` já serve como audit log de mensagens. O event store completo será uma tabela separada (`events`).
2. **Performance:** Eventos devem ser escritos de forma assíncrona (fire-and-forget) para não bloquear o fluxo principal — com buffer em Redis se necessário.
3. **Replay:** O sistema deve suportar replay de eventos para reconstruir estado de sessão em caso de falha.
4. **Alertas:** Eventos do tipo `tool.blocked`, `llm.injection_blocked` e `provider.circuit_open` devem disparar alertas imediatos.
