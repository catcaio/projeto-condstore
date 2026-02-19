# Condstore OS — Contratos de Providers

> **Status:** Contratos v0.1 — interfaces definidas, implementações reais pendentes.

## Princípios

| Princípio | Descrição |
|-----------|-----------|
| **Plugável** | Novos providers implementam a interface; zero mudança no orchestrator |
| **Fallback** | Todo provider crítico declara um fallback provider |
| **Idempotente** | Operações mutantes aceitam `idempotency_key` |
| **Auditável** | Toda chamada produz um evento no event log |
| **Fail-fast** | Timeout agressivo + circuit breaker (sem retry silencioso) |
| **Sem estado** | Providers são stateless; estado fica na sessão/DB |

---

## Interface Base

```typescript
// src/providers/provider.interface.ts

export interface ProviderMetadata {
  name: string;
  version: string;
  capabilities: string[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
}

export interface ProviderHealthStatus {
  healthy: boolean;
  latency_ms: number;
  checked_at: string; // ISO 8601
  error?: string;
}

/**
 * Interface base que todos os providers devem implementar.
 * TInput: tipo do input da operação principal
 * TOutput: tipo do output da operação principal
 */
export interface IProvider<TInput, TOutput> {
  /** Executa a operação principal do provider */
  execute(input: TInput): Promise<TOutput>;

  /** Verifica disponibilidade do serviço externo */
  healthCheck(): Promise<ProviderHealthStatus>;

  /** Metadados declarativos (capabilities, rate limits) */
  getMetadata(): ProviderMetadata;
}
```

---

## Provider: Frete (Freight)

```typescript
// src/providers/freight/freight.provider.interface.ts

export interface FreightQuoteInput {
  origin_cep: string;
  destination_cep: string;
  weight_kg: number;
  dimensions?: {
    height_cm: number;
    width_cm: number;
    length_cm: number;
  };
  declared_value_brl: number;
  idempotency_key: string;
}

export interface FreightOption {
  carrier: string;
  service_name: string;
  price_brl: number;
  delivery_days: number;
  tracking_available: boolean;
}

export interface FreightQuoteOutput {
  options: FreightOption[];
  quoted_at: string;
  origin_cep: string;
  destination_cep: string;
}

export interface IFreightProvider extends IProvider<FreightQuoteInput, FreightQuoteOutput> {
  /** Provider de fallback quando este falhar */
  fallback?: IFreightProvider;
}

// Implementações esperadas:
// - MelhorEnvioFreightProvider (existente, refatorar para interface)
// - CorreiosFreightProvider (futuro)
// - TabelaFreightProvider (existente, refatorar para interface)
```

---

## Provider: Pagamento (Payment)

```typescript
// src/providers/payment/payment.provider.interface.ts

export interface PaymentInitInput {
  tenant_id: string;
  order_id: string;
  amount_brl: number;
  description: string;
  payer: {
    name: string;
    document: string; // CPF ou CNPJ (mascarado nos logs)
    email?: string;
    phone?: string;
  };
  idempotency_key: string;
}

export interface PaymentInitOutput {
  payment_id: string;
  status: "PENDING" | "PROCESSING" | "FAILED";
  pix_copy_paste?: string;
  pix_qr_code_base64?: string;
  expires_at: string;
}

export interface PaymentStatusInput {
  payment_id: string;
  tenant_id: string;
}

export interface PaymentStatusOutput {
  payment_id: string;
  status: "PENDING" | "PROCESSING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  paid_at?: string;
  amount_brl: number;
}

export interface IPaymentProvider extends IProvider<PaymentInitInput, PaymentInitOutput> {
  getStatus(input: PaymentStatusInput): Promise<PaymentStatusOutput>;
  fallback?: IPaymentProvider;
}

// Implementações esperadas:
// - SicoobPaymentProvider (futuro — NÃO implementar agora)
// - StripePaymentProvider (futuro)
// - MockPaymentProvider (testes)
```

---

## Provider: Consulta CNPJ

```typescript
// src/providers/cnpj/cnpj.provider.interface.ts

export interface CNPJLookupInput {
  cnpj: string; // formato: 00.000.000/0000-00 ou 00000000000000
}

export interface CNPJLookupOutput {
  cnpj: string;
  razao_social: string;
  nome_fantasia?: string;
  situacao_cadastral: "ATIVA" | "SUSPENSA" | "INAPTA" | "BAIXADA" | "NULA";
  atividade_principal: {
    codigo: string;
    descricao: string;
  };
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
  };
  telefone?: string;
  email?: string;
  data_abertura: string; // YYYY-MM-DD
  consulted_at: string;  // ISO 8601
}

export interface ICNPJProvider extends IProvider<CNPJLookupInput, CNPJLookupOutput> {
  fallback?: ICNPJProvider;
}

// Implementações esperadas:
// - ReceitaFederalCNPJProvider (via API pública)
// - BrasilAPICNPJProvider (fallback gratuito)
```

---

## Provider: Shipping (Rastreamento)

```typescript
// src/providers/shipping/shipping.provider.interface.ts

export interface TrackingInput {
  tracking_code: string;
  carrier?: string;
}

export interface TrackingEvent {
  timestamp: string;   // ISO 8601
  status: string;
  description: string;
  location?: string;
}

export interface TrackingOutput {
  tracking_code: string;
  carrier: string;
  status: "IN_TRANSIT" | "DELIVERED" | "FAILED" | "RETURNED" | "UNKNOWN";
  estimated_delivery?: string;
  events: TrackingEvent[];
  last_updated: string;
}

export interface IShippingProvider extends IProvider<TrackingInput, TrackingOutput> {
  fallback?: IShippingProvider;
}

// Implementações esperadas:
// - CorreiosShippingProvider
// - MelhorEnvioShippingProvider
```

---

## Provider: Mensageria (Messaging)

```typescript
// src/providers/messaging/messaging.provider.interface.ts

export interface SendMessageInput {
  to: string;          // número destino (E.164)
  from: string;        // número origem (E.164)
  body: string;        // texto (máx. 1600 chars)
  media_url?: string;  // URL pública de mídia (opcional)
  idempotency_key: string;
}

export interface SendMessageOutput {
  message_id: string;
  status: "QUEUED" | "SENT" | "FAILED";
  sent_at: string;
}

export interface IMessagingProvider extends IProvider<SendMessageInput, SendMessageOutput> {
  fallback?: IMessagingProvider;
}

// Implementações existentes:
// - TwilioMessagingProvider (existente em src/providers/twilio.provider.ts — refatorar)
// Implementações futuras:
// - WhatsAppBusinessAPIProvider
```

---

## Registro de Providers (Registry)

```typescript
// src/providers/registry.ts (futuro)

export interface ProviderRegistry {
  freight: IFreightProvider;
  payment: IPaymentProvider;
  cnpj: ICNPJProvider;
  shipping: IShippingProvider;
  messaging: IMessagingProvider;
}

// O registry é configurado por tenant no Control Plane.
// Providers são injetados, nunca importados diretamente no domínio.
```

---

## Padrão de Implementação

Todo provider concreto deve:

1. Implementar a interface correspondente
2. Declarar timeout máximo (padrão: 5 s para read, 10 s para write)
3. Expor `fallback` se for provider crítico
4. Nunca lançar exceção raw — encapsular em `ProviderError` (`src/infra/errors.ts`)
5. Registrar duração de cada chamada via event log

```typescript
// Exemplo de estrutura
export class MelhorEnvioFreightProvider implements IFreightProvider {
  readonly fallback = new TabelaFreightProvider();

  async execute(input: FreightQuoteInput): Promise<FreightQuoteOutput> {
    // TODO: implementar integração real
    throw new ProviderError("NOT_IMPLEMENTED", "MelhorEnvio integration pending");
  }

  async healthCheck(): Promise<ProviderHealthStatus> {
    // TODO: implementar ping ao endpoint de status
    return { healthy: false, latency_ms: 0, checked_at: new Date().toISOString() };
  }

  getMetadata(): ProviderMetadata {
    return {
      name: "melhor-envio",
      version: "2.0",
      capabilities: ["quote", "label"],
      rateLimit: { requestsPerMinute: 60, requestsPerDay: 5000 },
    };
  }
}
```
