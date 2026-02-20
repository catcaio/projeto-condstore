# Condstore OS — Visão Geral

> **Status:** Rascunho v0.1 — scaffolding inicial, sem implementação de integrações.

## O que é o Condstore OS

O **Condstore OS** é a camada de controle e orquestração do ecossistema Condstore. Ele abstrai a complexidade das integrações (transportadoras, meios de pagamento, CNPJ, mensageria) em uma interface única e coerente — tanto para humanos (Cockpit UI) quanto para processos automatizados (LLM Orchestrator).

O nome "OS" (Operating System) reflete a ideia central: assim como um SO gerencia recursos de hardware para aplicações, o Condstore OS gerencia *providers* externos para o fluxo logístico.

---

## Arquitetura em Três Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                         COCKPIT UI                          │
│   (Interface humana: Configurações, Métricas, Auditoria)    │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / Server Actions
┌────────────────────────────▼────────────────────────────────┐
│                       CONTROL PLANE                         │
│   LLM Orchestrator · Allowlist · Event Log · Rate Limit     │
│   State Machine · Schema Validation · PII Masking           │
└────────────────────────────┬────────────────────────────────┘
                             │ Provider Contracts
┌────────────────────────────▼────────────────────────────────┐
│                        DATA PLANE                           │
│   Freight Providers · Payment · CNPJ · Shipping · Messaging │
│   Database (TiDB) · Cache (Redis) · Audit Store            │
└─────────────────────────────────────────────────────────────┘
```

### Cockpit (UI / Interface Humana)

- Dashboard de métricas operacionais
- Página de **Configurações** inspirada no app Configurações do iOS
- Gestão de tenants, usuários e permissões
- Auditoria de eventos em tempo real

### Control Plane (Orquestração)

- **LLM Orchestrator**: classifica intents, extrai entidades e redige respostas (Modo B)
- **Allowlist de tools**: apenas ferramentas pré-autorizadas podem ser invocadas pelo LLM
- **Event Log**: todo comando emitido pelo LLM é registrado antes de ser executado
- **Guardrails**: schema validation, injection hard-block, rate limit, PII masking

### Data Plane (Integrações)

- **Providers** com contratos TypeScript estritos (interfaces)
- Cada provider implementa: `execute()`, `healthCheck()`, `getMetadata()`
- Fallback obrigatório para providers críticos
- Idempotência para operações mutantes

---

## Princípios de Design

| Princípio | Descrição |
|-----------|-----------|
| **Tool-first** | O LLM executa ações via tools declaradas, nunca via código livre |
| **Audit by default** | Todo evento é logado antes de ser confirmado |
| **Fail safe** | Providers com falha ativam fallback; nunca expõem erro bruto ao usuário |
| **Plugável** | Novos providers são adicionados implementando a interface padrão |
| **Idempotente** | Operações mutantes aceitam `idempotency_key` |
| **Multi-tenant** | Todo recurso é escopo do `tenant_id` |

---

## Roadmap (scaffolding apenas — sem datas)

- [ ] LLM Orchestrator: integração real com modelo (OpenAI / Anthropic)
- [ ] Provider: Frete (Melhor Envio expandido + Correios)
- [ ] Provider: Pagamento (Sicoob / PIX)
- [ ] Provider: Consulta CNPJ
- [ ] Provider: Mensageria (WhatsApp Business API v2)
- [ ] Cockpit: Auditoria de eventos ao vivo
- [ ] Cockpit: Gestão de allowlist por tenant

---

## Referências Internas

- [`docs/os/ui-styleguide.md`](./ui-styleguide.md) — Guia visual do Cockpit
- [`docs/os/llm-orchestrator.md`](./llm-orchestrator.md) — Arquitetura do LLM Orchestrator
- [`docs/os/providers.md`](./providers.md) — Contratos de providers
- [`docs/os/event-model.md`](./event-model.md) — Modelo de eventos e auditoria
- [`ARCHITECTURE.md`](../../ARCHITECTURE.md) — Arquitetura técnica detalhada
