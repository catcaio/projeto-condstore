# Condstore OS — LLM Orchestrator (Modo B)

> **Status:** Contrato v0.1 — scaffolding. Nenhuma integração real com modelo LLM foi implementada.

## Visão Geral

O **LLM Orchestrator** opera no **Modo B**: o LLM não gera respostas livres — ele **classifica**, **extrai entidades** e **redige** uma resposta estruturada a partir de um template, sempre dentro de um schema JSON pré-definido.

O fluxo é:
```
Mensagem do usuário
  → Intent Classification (rule-based + LLM fallback)
  → Entity Extraction (structured output)
  → Tool Execution (allowlist only)
  → Response Drafting (template-based)
  → Event Log
  → Mensagem ao usuário
```

---

## Intents Padronizadas

```typescript
// src/core/conversation/intents.ts (referência)
export const INTENTS = {
  // Fretes
  FREIGHT_QUERY: "FREIGHT_QUERY",
  PROVIDE_CEP: "PROVIDE_CEP",
  PROVIDE_QUANTITY: "PROVIDE_QUANTITY",

  // Pedidos
  TRACK_ORDER: "TRACK_ORDER",
  ORDER_STATUS: "ORDER_STATUS",

  // Financeiro (futuro)
  PAYMENT_STATUS: "PAYMENT_STATUS",
  INVOICE_REQUEST: "INVOICE_REQUEST",

  // Suporte
  HUMAN_SUPPORT: "HUMAN_SUPPORT",
  HELP: "HELP",
  CANCEL: "CANCEL",
  RESET: "RESET",

  // Desconhecido
  UNKNOWN: "UNKNOWN",
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];
```

---

## State Machine de Conversa

```
                    START
                      │
                      ▼
              ┌──────IDLE──────┐
              │                │
         FREIGHT_QUERY    TRACK_ORDER
              │                │
              ▼                ▼
       AWAITING_CEP     AWAITING_ORDER_ID
              │
         CEP_PROVIDED
              │
              ▼
     AWAITING_QUANTITY
              │
      QUANTITY_PROVIDED
              │
              ▼
          CALCULATING ──── ERROR
              │
    CALCULATION_SUCCESS
              │
              ▼
          COMPLETED
              │
              ▼
             IDLE (reset automático após TTL)
```

### Transições

| Estado Atual | Evento | Próximo Estado |
|--------------|--------|----------------|
| IDLE | START_FREIGHT_QUERY | AWAITING_CEP |
| AWAITING_CEP | CEP_PROVIDED | AWAITING_QUANTITY |
| AWAITING_CEP | CANCEL | IDLE |
| AWAITING_QUANTITY | QUANTITY_PROVIDED | CALCULATING |
| AWAITING_QUANTITY | CANCEL | IDLE |
| CALCULATING | CALCULATION_SUCCESS | COMPLETED |
| CALCULATING | CALCULATION_ERROR | ERROR |
| ERROR | RESET | IDLE |
| COMPLETED | RESET | IDLE |
| * | HUMAN_SUPPORT | IDLE (escalate) |

---

## Schema de Saída do LLM (JSON)

O LLM deve sempre retornar um objeto JSON validado pelo schema abaixo. Respostas fora do schema são **rejeitadas** pelo orchestrator.

```typescript
import { z } from "zod";

export const LLMOutputSchema = z.object({
  /** Intent classificada */
  intent: z.enum([
    "FREIGHT_QUERY", "PROVIDE_CEP", "PROVIDE_QUANTITY",
    "TRACK_ORDER", "ORDER_STATUS", "PAYMENT_STATUS",
    "INVOICE_REQUEST", "HUMAN_SUPPORT", "HELP",
    "CANCEL", "RESET", "UNKNOWN",
  ]),

  /** Confiança da classificação (0–1) */
  confidence: z.number().min(0).max(1),

  /** Entidades extraídas */
  entities: z.object({
    cep: z.string().regex(/^\d{5}-?\d{3}$/).optional(),
    quantity: z.number().int().min(1).max(9999).optional(),
    orderId: z.string().optional(),
    cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/).optional(),
  }),

  /** Tool a invocar (null = apenas resposta de texto) */
  tool: z.object({
    name: z.string(),
    args: z.record(z.unknown()),
  }).nullable(),

  /** Resposta redigida para o usuário */
  reply: z.object({
    text: z.string().max(1600), // Limite WhatsApp
    quick_replies: z.array(z.string().max(20)).max(3).optional(),
  }),

  /** Metadados do raciocínio (não exposto ao usuário) */
  reasoning: z.string().optional(),
});

export type LLMOutput = z.infer<typeof LLMOutputSchema>;
```

---

## Allowlist de Tools

Somente as tools listadas abaixo podem ser invocadas pelo LLM. Qualquer tool fora da lista é **bloqueada** pelo orchestrator antes da execução.

```typescript
export const TOOL_ALLOWLIST = [
  "freight.quote",          // Cotação de frete
  "freight.compare",        // Comparação de transportadoras
  "order.track",            // Rastreamento de pedido
  "cnpj.lookup",            // Consulta CNPJ
  "session.reset",          // Reset de sessão
  "human.escalate",         // Escalar para humano
] as const;

export type AllowedTool = (typeof TOOL_ALLOWLIST)[number];
```

**Regra:** O orchestrator valida `output.tool.name` contra a allowlist **antes** de chamar o provider. Se não estiver na lista, o evento é logado como `TOOL_BLOCKED` e a requisição é abortada.

---

## Guardrails

### 1. Tool-First

O LLM nunca executa ações diretamente. Toda ação é mediada por uma tool declarada. O orchestrator é o único executor.

```
LLM → output.tool → Allowlist check → Provider → Event log → Result
```

### 2. Schema Validation

Todo output do LLM é validado com `LLMOutputSchema.safeParse()`. Se falhar:
- Log: `LLM_SCHEMA_ERROR`
- Fallback: resposta genérica de erro
- Sem retentativa automática (evitar loops)

### 3. Injection Hard-Block

O orchestrator detecta e bloqueia padrões de prompt injection antes de enviar ao LLM:

```typescript
const INJECTION_PATTERNS = [
  /ignore (all |previous )?instructions/i,
  /you are now/i,
  /act as/i,
  /system prompt/i,
  /\{\{.*\}\}/,  // template injection
  /<script/i,
];

function sanitizeInput(text: string): { safe: boolean; blocked: string[] } {
  const blocked = INJECTION_PATTERNS
    .filter(p => p.test(text))
    .map(p => p.toString());
  return { safe: blocked.length === 0, blocked };
}
```

### 4. Rate Limit

Por `tenant_id` + `phone_number`:
- Máximo: **60 mensagens / hora**
- Burst: **5 mensagens / 10 segundos**
- Implementação: Redis sliding window (ver `src/infra/rate-limiter.ts`)

### 5. PII Masking

Antes do log, dados sensíveis são mascarados:

```typescript
function maskPII(text: string): string {
  return text
    .replace(/\d{11}/g, "***.***.***-**")      // CPF
    .replace(/\d{14}/g, "**.***.***\/****-**")  // CNPJ
    .replace(/(\+\d{2})\d{8,9}(\d{4})/g, "$1****$2"); // Telefone
}
```

---

## Event Log Obrigatório

**Todo** comando emitido pelo orchestrator deve ser logado antes de ser executado. Estrutura mínima do evento:

```typescript
interface OrchestratorEvent {
  /** ID único do evento (UUIDv4) */
  event_id: string;

  /** Timestamp ISO 8601 */
  timestamp: string;

  /** Tenant */
  tenant_id: string;

  /** Sessão do usuário */
  session_id: string;

  /** Tipo do evento */
  type:
    | "LLM_INPUT"
    | "LLM_OUTPUT"
    | "LLM_SCHEMA_ERROR"
    | "TOOL_CALLED"
    | "TOOL_BLOCKED"
    | "TOOL_SUCCESS"
    | "TOOL_ERROR"
    | "RATE_LIMIT_HIT"
    | "INJECTION_BLOCKED"
    | "REPLY_SENT";

  /** Payload do evento (sem PII) */
  payload: Record<string, unknown>;

  /** Duração em ms (para TOOL_*) */
  duration_ms?: number;
}
```

**Regra:** O evento `TOOL_CALLED` é escrito **antes** da chamada ao provider. O evento `TOOL_SUCCESS` ou `TOOL_ERROR` é escrito **após** a resposta.

---

## Contrato do Orchestrator (Interface)

```typescript
// src/core/llm/orchestrator.interface.ts
export interface ILLMOrchestrator {
  /**
   * Processa uma mensagem de entrada e retorna a resposta.
   * Nunca lança exceção — erros são encapsulados no resultado.
   */
  process(input: OrchestratorInput): Promise<OrchestratorResult>;

  /** Retorna o histórico de eventos da sessão */
  getEventLog(sessionId: string): Promise<OrchestratorEvent[]>;
}

export interface OrchestratorInput {
  tenant_id: string;
  session_id: string;
  phone: string; // mascarado nos logs
  message: string;
  timestamp: string;
}

export interface OrchestratorResult {
  reply: string;
  intent: Intent;
  tool_executed: AllowedTool | null;
  event_id: string;
  error?: {
    code: string;
    user_message: string;
  };
}
```

---

## Notas de Implementação Futura

1. **Modelo LLM**: o provider de LLM deve implementar uma interface separada (`ILLMProvider`) — não acoplar ao orchestrator.
2. **Retry policy**: somente para erros de rede (5xx), nunca para schema errors.
3. **Circuit breaker**: após 5 falhas consecutivas do LLM, entrar em modo degradado (rule-based only).
4. **Observabilidade**: emitir métricas de latência por tool via event log.
