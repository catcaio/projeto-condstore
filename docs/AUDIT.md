# Auditoria Técnica - Condstore OS

## Resumo do Estado Atual
O projeto evoluiu de um MVP de cotação logística para um verdadeiro Sistema Operacional (Condstore OS), baseado numa arquitetura SaaS Multi-Tenant robusta com processamento via WhatsApp e Gateway de IA integrado. O projeto conta com pipeline assíncrono para side-effects pesados, governança madura de IA (incluindo versionamento, redação PII e detecção de injection), e um Design System próprio.

## Mapa de Módulos

* **FinOps:** Motor de controle orçamentário diário e mensal em base USD. Inclui travas lógicas rigorosas (Lock/Unlock) impulsionadas pelo Gateway de IAs caso o tenant estoure o budget. Monitora acumulação por traceId e uso por LLM tokens.
* **Event Bus / Worker:** Componente responsável por lidar com side-effects pesados sem bloquear o Event Loop HTTP. Baseado em Redis Streams (XADD/XREADGROUP), coordena retrys locais e Dead Letter Queues (DLQ) para FinOps alerts, lock transitions e monthly resets.
* **AI Governance:** Proxy seguro posicionado à frente do provedor real LLM. Versiona e injeta Prompts dinamicamente por módulo, realiza a censura PII (Removendo e-mails, senhas, CPF, Cartões para evitar vazamentos), e intercepta heuristics de Prompt Injections enviando logs estruturados via telemetria.
* **Cockpit UI:** Dashboard e UI operacional para administração da loja. Arquitetura orientada à components e "Saved Views" gerando flexibilidade na auditoria das sessões RAG, FinOps, LLM Analytics via Server Actions limpas e API restFul.
* **Tokens / Design System:** Design escalável construído sob variáveis nativas CSS isoladas em light/dark mode e um subset de aliases semânticos. Monitorado e impedido de ter vazamentos de 'hardcode hexcolors' por script custom de lint.

## Endpoints Principais

* **Cockpit Analytics:** `GET /api/cockpit/metrics/acquisition` (Métricas sumarizadas de sessões x conversão).
* **Internos / Jobs:** 
  * `POST /api/internal/jobs/rollup-daily` (Job diário para ETL de métricas analíticas).
  * `GET /api/internal/events/dlq` (Busca eventos falhos irrecuperáveis na fila de mortos).
* **FinOps Operacional:** `POST /api/painel-logistico` (Cotações), dentre outros utilitários de lock manager/AI Providers.

## Workers e Background Tasks

* **Como rodar:** `npm run worker:finops`.
* **O que processa:** `events:finops`, incluindo: Invalidação de Cache, FinOps Alerts, Lock Triggers, Resets Mensais.
* **DLQ (Dead Letter Queue):** Eventos reprocessados e que falham persistentes caem em `events:finops:dlq`, interceptáveis via rota da API interna, liberando o grupo do stream de veneno contínuo.

## Migrations Drizzle Existentes (A partir da 0005)

* **0005+:** Tabelas e schemas incrementais adicionando `freight_funnel_events`, `freight_simulation_logs`, `public_events` para trackings, metrics e sessions.
* **Intermediárias:** `tenant_saved_views`, `ai_decision_logs`, `frank_events` introduzindo metadados de observabilidade das requisições com IA e views do cockpit.
* **Recentes (FinOps/Gov):** `token_usage_events`, `tenant_budgets`, `ai_prompts`, `finops_lock_events`, `finops_monthly_resets` — consolidação da barreira arquitetônica do gateway, locks de segurança por faturamento e governança de payloads de IA via registro de prompts na tabela final `ai_eval_runs`.

## Checklist de Segurança

* [x] **RBAC / Tenant Isolation:** Todas as queries base exigem `tenantId`. APIs verificam ownership rigorosamente.
* [x] **Internal-Token Endpoints:** CRONs e Workers operam sob rotas blindadas via header `x-internal-token`.
* [x] **PII Redaction:** Mascaramento Regex de E-mails, CPFs/CNPJs, Cartões e Telefones *antes* do Gateway do Modelo.
* [x] **Injection Flagging:** Padrões maliciosos caem em heuristics "detectInjection" engatados na log de observabilidade do FinOps.

## Checklist de Observabilidade

* [x] **Logs Estruturados:** Formato padronizado de logs JSON em STDOUT rastreando tenantId, traceId e errorCodes via Pino/Winston adapter core.
* [x] **Request ID Mapping:** Correlação direta nas invocações entre Gateway -> Frank Event Logs -> FinOps token usage.
* [x] **DLQ Endpoint:** Rastreabilidade ativa de falhas hard em workers baseados no Redis (`/api/internal/events/dlq`).

## Backlog Curto (Itens Críticos Próximos)

1. **Dashboard de Monitoramento da FinOps DLQ no Cockpit:** Criar UI baseada nas chamadas do recém criado internal endpoint para que adms restabeleçam os eventos mortos facilmente.
2. **Alertas via Webhook:** Configurar alertas proativos no Discord/Slack sempre que o limite degrado ou bloqueado for excedido no tenant-state-resolver.
3. **Múltiplos Providers em Fallback Dinâmico:** Se a OpenAI cair com Request Timeout, fazer switch para Provider B (ex: Anthropic Claude ou OpenRouter) no LLM Gateway sem repassar impacto pro usuário de zap.
