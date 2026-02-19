# Projeto CondStore - Automação de Entregas

Sistema de automação logística via WhatsApp para cotação de fretes e pedidos, integrado com TiDB e Twilio.

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
