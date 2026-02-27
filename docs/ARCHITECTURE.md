# Arquitetura Master - Condstore OS

## Visão em Alto Nível das Camadas

O sistema Condstore baseia-se num back-end sólido (Next.js 14) dividido em módulos operacionais independentes para separar intenção, custo e infraestrutura local (WhatsApp + API Privada), orquestrando fluxos em uma base multi-tenant de ponta a ponta.

- **Camada SaaS (Isolation Layer):** Gerencia assinaturas, billing e Tenant Isolation Restrito via SQL RLS abstrato/explicit queries pelo tenantId em todos os ORM wrappers de Drizzle / TiDB + RateLimit em Redis por usuário.
- **Data/Event Plane:** Pipeline responsivo por trás da recepção dos SMS/Mensagens via Twilio assíncrono.
- **Control Plane:** Módulo de Decisão de Negócios/Frank AI que processa pedidos baseando-se em Contexto, Prompts Estritos controlados via Registry Database e tools determinísticas.
- **Background Workers:** Redis Stream Consumers (`worker:finops`) rodando desacoplados do request/response model pro alívio estrito contra timeouts via processamentos colateais longos como Resets mensais ou Invalidações de Cache.

## Principais Fluxos de Informação

### 1. Request -> FinOps -> State -> AI Gateway
Quando um usuário engaja via Zap ou Bot Web:
- A mensagem bate na Route Handler de Webhook assinada.
- O Sistema recupera o `TenantState` antes do dispatch no Gateway (`getTenantState`), calculando o BudgetUSD corrente vs Limite via `token_usage_events`. 
- Caso bloqueado, devolve o fallback Upsell localmente travando requisição ao Provider; Se degradado faz hot-swap pra modelo lite (gpt-4o-mini). Caso OK flui.
- Antes da LLM requestar OpenAi, os Inputs passam por filtros PII e Injections e recebem o "Prompt Ativo" referenciado pelo módulo via `ai_prompts` table. Retorna gerando Events no DB e atualizando usage stats no repository side.

### 2. Side-Effects via Event publish -> Worker -> DLQ
Ao invés de estourar a transaction:
- Modificações longas produzem `{ publishEvent({ type: 'LOCK', data }) }` no stream do Redis (`events:finops`).
- Scripts externos (Processos contínuos via terminal Node) retiram no pattern Consumer Groups/Block esses UUIDs rodando os handles (envios de emails de lock, atualizações orçamentárias pesadas, clearCache front). Confirmam a leitura com `ACK`.
- Se crasharem, caem numa série exponencial de retrys (até 5). Rompendo os limites ganham passagens "fire-and-forget" de desvio ao Storage de `event:finops:dlq` mantendo fluidez dos bons.

### 3. Monthly Reset Triggers (Lazy)
Em vez de dependermos puramente de crons sensíveis:
- A engine avalia no instante de invocação de state a timestamp de "lastReset" persistida por tenant. 
- Virou o mês base americana/SP? Ela despacha como evento silencioso o "MONTHLY RESET" da conta (acumulando resíduos das ultimas frações prev-month numa table de auditoria) zerando consumos USD pra prosseguir atendendo até os top nodes sem corromper Request principal da AI, executado apenas por debaixo das rotas em Background.

## FinOps & AI Database Schema (Resumo)
As lógicas essenciais de controle repousam em:
- `tenant_budgets`: Armazenam os thresholds, USD atual e estados (`locked`, `degraded`).
- `finops_alert_events` e `finops_lock_events`: Armazenam gatilhos operacionais acionados sempre que se cruza o threshold. Lock guarda "se travou e porque" junto da data (pra analytics/recuperação).
- `frank_events` / `ai_decision_logs`: Logam cada transação I/O da Máquina principal rastreando token/rag info.
- `ai_prompts` e `ai_eval_runs`: Versões das instruções base carregadas pelo sistema antes de montar o contexto gerador em conjunto da pontuação off-line obtida por teste contra injection/PIIs.

## Contratos Internos e Proteções
- **Tokens Internos (`x-internal-token`):** API Crons de rollups diários ou inspeções diretas em Dead-Letter Queues das mensagerias dependem do Header processual que cruza validades ambientais para operar isolados em webhooks/cronjobs externos e admin portals. Sequer o middleware permite.
- **RBAC (Role Based Access):** Autenticações web por default usam `sessionVersion` com invalidações seguras.

## Design System como Infraestrutura Oficial
- Toda folha de estilo da web está atrelada à Infraestrutura global de Design baseada em variáveis CSS do `:root`.
- Uso estrito das coleções de "Tokens": `typography`, `light` (Cloud Dancer), `dark` e camada combinadora `semantic` para layouts.
- Scripts de Lint Customizados do CI (`npm run lint:design-system`) processam pro-ativamente Regex no fonte evitando vazamentos nocivos paralelos de hex codes (`#fff`) assegurando uniformidade absoluta e testabilidade na automação (Visual Regression Testing via Playwright Snapshot Update).
