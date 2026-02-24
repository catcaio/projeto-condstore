# Projeto CondStore - Automação de Entregas

Sistema de automação logística via WhatsApp para cotação de fretes e pedidos, integrado com TiDB e Twilio.
Este README é o documento oficial do **Condstore OS**, refletindo a arquitetura SaaS multi-tenant com camada de IA (Frank).

## Condstore OS Architecture Overview

- **Multi-tenant foundation:** isolamento lógico por `tenant_id`, configuração e dados segregados, com execução e métricas por tenant.
- **WhatsApp Processing Pipeline:** ingestão Twilio → validação de assinatura → resolução de tenant → classificação de intenção → roteamento para fluxo correto.
- **Tool Execution Layer:** camada padronizada de execução de ferramentas com contratos explícitos, validação de entrada/saída e guardrails.
- **Frank (AI Engine):** orquestração LLM tool-first com saída estruturada obrigatória e RAG por tenant.
- **Cockpit & Observability:** UI operacional, métricas, auditoria e trilhas de decisão para diagnósticos e compliance.
- **Billing & SaaS Layer:** medição de uso, planos, limites, cobrança e governança de consumo por tenant.

## Frank (AI Engine)

- **Abstração de providers:** suporta `shared`, `dedicated` e `customer-hosted`, permitindo troca de vendor sem impacto no domínio.
- **Structured output obrigatório:** respostas em JSON com schema validado, reduzindo ambiguidade e garantindo compatibilidade com tools.
- **RAG por tenant:** índices e vetores segregados por `tenant_id`, com políticas de retenção e atualização independentes.
- **Tool orchestration:** seleção e execução de tools em cadeia com contratos explícitos, retries controlados e fallback.
- **Decision logging:** trilhas de decisão com entradas/saídas, versões de prompts e metadata para auditoria.

## Multi-Tenant Isolation Guarantees

- `tenant_id` obrigatório em toda rota, job, evento e execução de tool.
- Consultas sempre escopadas (`tenant_id` como filtro obrigatório) e acesso negado por default.
- Rate limiting por tenant para proteger recursos e garantir fairness.
- Audit logging por tenant com imutabilidade e retenção configurável.

## Roadmap v2 — Multi-Tenant AI Ready

- AI Gateway abstraction.
- `tenant_ai_provider` table.
- RAG infrastructure.
- AI observability.
- Enterprise isolation.

##  Funcionalidades

- **Webhook WhatsApp (Twilio):** Recebe mensagens, resolve o tenant e classifica a intenção.
- **Resolução de Tenant:** Identifica a loja/cliente com base no número de destino (Twilio Number).
- **Classificação de Intenção:** Detecta se o usuário quer "Cotação", "Preço/Frete" ou "Pedido".
- **Painel Logístico:** Interface para simulação manual de fretes.

##  Stack Tecnológico

- **Framework:** Next.js 14+ (App Router)
- **Banco de Dados:** TiDB (MySQL Compatible)
- **ORM:** Drizzle ORM
- **Integrações:** Twilio API (WhatsApp)
- **Infra:** Vercel (Frontend/API) + Upstash (Redis - Opcional)

## Getting Started

1. **Instalar dependências:** `npm install`.
1. **Configurar `.env`:** `cp .env.example .env` e preencher variáveis obrigatórias.
1. **Rodar migrations:** `npm run db:push`.
1. **Rodar dev server:** `npm run dev`.

##  Configuração Local

### 1. Pré-requisitos
- Node.js 18+
- Conta no Twilio (Sandbox ou Produção)
- Cluster TiDB Serverless

### 2. Instalação
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
```

### 3. Configuração do .env
Edite o arquivo `.env` preenchendo os campos obrigatórios marcados com `*`.

```properties
DATABASE_URL=mysql://usuario:senha@host:port/db?ssl={"rejectUnauthorized":true}
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=whatsapp:+1415...
```

### 4. Executar
```bash
# Rodar servidor de desenvolvimento
npm run dev
```

O projeto estará rodando em `http://localhost:3000`.

## Segurança — Validação de Assinatura do Webhook

Todo request recebido em `POST /api/webhook` tem sua assinatura HMAC-SHA1 do Twilio validada antes de qualquer processamento. Isso bloqueia spoofing de webhook.

### Variáveis necessárias

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `TWILIO_AUTH_TOKEN` | **Sim** | Token de autenticação da sua conta Twilio. |
| `TWILIO_WEBHOOK_BASE_URL` | Recomendada | URL base pública do deploy (ex: `https://yourapp.vercel.app`). Se não definida, a URL é montada a partir dos headers `x-forwarded-proto`/`x-forwarded-host`. Deve coincidir com a URL configurada no painel Twilio. |
| `TWILIO_SIGNATURE_VALIDATION_ENABLED` | Não | `false` desativa a validação (apenas dev local). **Nunca use `false` em produção.** |

### Como funciona

A lógica vive em `src/server/twilio/verifyWebhook.ts`:
- **`getPublicUrl(req)`** — reconstrói a URL exata usada pelo Twilio, respeitando proxies.
- **`verifyTwilioSignature({ req, rawBody, formParams })`** — valida o header `X-Twilio-Signature`:
  - `application/x-www-form-urlencoded` → `validateRequest(authToken, sig, url, params)`
  - `application/json` → `validateRequestWithBody(authToken, sig, url, rawBody)` (inclui verificação do `bodySHA256`)
- Retorna `false` (nunca lança) em caso de token ausente, header ausente ou HMAC inválido.
- Em caso de falha, loga apenas diagnóstico (proto/host/path) — **nunca o auth token**.

### Desenvolvimento local com ngrok

```bash
# 1. Inicie o túnel ngrok
ngrok http 3000

# 2. Configure no .env:
TWILIO_WEBHOOK_BASE_URL=https://<seu-id>.ngrok-free.app
# ou, para desativar a validação localmente:
TWILIO_SIGNATURE_VALIDATION_ENABLED=false
```

##  Webhooks e Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/webhook` | Recebe mensagens do Twilio. |
| GET | `/api/health` | Status do sistema (DB, Redis). |
| GET | `/api/internal/health/ai` | Health check da camada de IA (LM Studio `/v1/models`). |
| POST | `/api/painel-logistico` | API do painel de cotação. |
| GET | `/api/debug/tenants` | Lista tenants (apenas DEV). |

##  Testes

### Verificação de Webhook
Use o script de diagnóstico para validar a resolução de tenant sem precisar do Twilio:
```bash
npx tsx scripts/debug-tenant-resolution.ts
```

### Teste de Painel
```bash
npx tsx scripts/test-panel-api.ts
```

### RAG Local (Qdrant + Corpus de Docs)
Para testar retrieval com documentos estáveis do repositório (README/docs), use:

```bash
# 1) Subir Qdrant local
docker compose -f docker-compose.qdrant.yml up -d

# 2) Configurar embeddings locais (LM Studio) no .env
# DEFAULT_LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
# DEFAULT_EMBED_MODEL=text-embedding-nomic-embed-text-v1.5

# 3) Ingerir docs do repo no Qdrant (multi-tenant)
node scripts/ingest-docs-to-qdrant.mjs --tenantId lojacond-default --paths README.md,docs --chunkSize 800 --overlap 120

# 4) Testar retrieval (mostrar top-k + context pack)
RAG_MIN_SCORE=0 npx tsx scripts/test-retrieve.mjs lojacond-default "Como rodar o projeto" 5
```

O ingest é idempotente por `tenantId + path + chunk_index` (point id determinístico no Qdrant).

##  Estrutura de Pastas

- `/src/app/api`: Rotas da API (Webhook, Health, etc).
- `/src/infra`: Repositórios, Configuração de DB e Loggers.
- `/src/lib`: Utilitários (Normalização, Engine de Frete).
- `/scripts`: Scripts de manutenção e teste.
- `/docs`: Documentação e relatórios de projeto.

---

## Condstore OS

O **Condstore OS** é a camada de controle e orquestração em desenvolvimento sobre o core de automação. Organiza a plataforma em três planos:

- **Cockpit (UI):** interface de configurações e métricas, inspirada no app Configurações do iOS.
- **Control Plane:** LLM Orchestrator (Modo B) com tool-first, allowlist, guardrails e event log.
- **Data Plane:** providers plugáveis para Frete, Pagamento, CNPJ, Rastreamento e Mensageria.

### Documentação Condstore OS

| Documento | Descrição |
|-----------|-----------|
| [`docs/os/vision.md`](docs/os/vision.md) | Visão geral: Control Plane / Data Plane / Cockpit |
| [`docs/os/ui-styleguide.md`](docs/os/ui-styleguide.md) | Guia visual: tokens, componentes, temas |
| [`docs/os/llm-orchestrator.md`](docs/os/llm-orchestrator.md) | Arquitetura do LLM (Modo B), intents, guardrails |
| [`docs/os/providers.md`](docs/os/providers.md) | Contratos de providers (interfaces TypeScript) |
| [`docs/os/event-model.md`](docs/os/event-model.md) | Modelo de eventos e auditoria |

### UI Kit

Componentes base em `src/components/ui/`:

- `TopBar` — barra superior com título central e ações laterais
- `GroupedSection` — seção agrupada estilo iOS Settings
- `SettingsRow` — linha com ícone, label e valor à direita
- `ToggleRow` — linha com toggle estilo iOS
- `ValueRow` — linha label + valor + chevron
- `DangerRow` — linha destrutiva (sair, excluir)
- `Icon` — wrapper para SVGs inline com stroke padrão

### Rota de Configurações

Disponível em `/settings` (grupo de rotas `(cockpit)`):

```
/settings — Página de Configurações do Condstore OS
```

Suporta tema **Claro / Escuro / Sistema** com persistência em `localStorage('condstore:theme')` e anti-flash via script inline.

---
**Desenvolvido para Lojacond**
