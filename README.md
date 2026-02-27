# Condstore OS - Automação Multi-Tenant & AI Platform

Sistema logístico multi-tenant via WhatsApp, com camada nativa de Governance em IA, arquitetura orientada à processamentos baseados em eventos e controle orçamentário granular (FinOps).

## Visão Geral

- **Multi-Tenant:** Isolamento RLS por `tenantId` (dados, budget, IA provider, métricas).
- **Control Plane de IA:** Governança sobre a inferência do LLM (versionamento, guardrails injetados, filtro PII de segurança).
- **FinOps Resiliente:** Limites duplos de Token e Faturamento (USD), geridos assincronamente por filas confiáveis (`Redis Streams`) operando sem degradar o Event-Loop do webserver via **Worker Process**.
- **Observabilidade Total:** Endpoints protegidos (`x-internal-token`) para auditoria de falhas, filas irrecuperáveis (DLQ) e trilhas determinísticas das predições de IAs (`ai_decision_logs`).
- **Cockpit UI & Infra de Design:** Dashboard moderno construído sob padronização estrita CSS unificados (`styles/tokens.*`) mapeando variações Semânticas (Claro, Escuro) protegidas contra desfiguração visual (`npm run lint:design-system`).

> Veja a documentação técnica oficial atualizada:  
> [Auditoria Técnica (Status)](docs/AUDIT.md) | [Mapeamento de Arquitetura (Fluxos)](docs/ARCHITECTURE.md) | [Manuais e Operações do Worker](docs/workers.md)

## Requisitos Iniciais
- **Node.js**: v18+
- **Database**: TiDB Cluster / Local MySQL compatível
- **Message Broker**: Redis Server 6+ (necessário pro Event Bus & Rate Limiter)

## Setup Local & Variáveis

1. **Instalando as dependências:**
```bash
npm install
```

2. **Configurando seu `.env`:**
Copie o template e reponha o necessário:
```bash
cp .env.example .env
```
*(Certifique-se de popular `DATABASE_URL`, credenciais base `TWILIO`, cache `REDIS_URL` para o stream de eventos, e as master-keys de Auth `INTERNAL_JOB_TOKEN` / `AUTH_SECRET`).*

3. **Subindo Schema & Migrations no DB:**
```bash
npm run db:push
```

## Scripts Principais (Day-to-day)

- **`npm run dev`** → Sobe o Next.js Webserver na porta Padrão (`3015` ou via `APP_URL`).
- **`npm run worker:finops`** → Sobe o consumidor de Background Tasks para Eventos de Trava, Reset e Invalidações via Redis. Obrigatório pra rodar lógicas em filas (side-effects não engasgam `dev` principal sem isso).
- **`npm run typecheck`** → Validação de checagem do TypeScript sem emitiçao (`--noEmit`);
- **`npm test`** → Dispara todos os frameworks Vitest do core (AI, Resoluções e Gateway Evals).
- **`npm run lint:design-system`** → Executa o script Vitest garantindo que Nenhum residual HEXHardcode vazou no ecossistema protegido recém estabelecido.
- **`npm run qa:snapshots`** / **Playwright** → Suíte de Testes Snapshot (Regressão Visual & End-to-end simulado):
  - Pra debugar a página de Cockpit localmente, rodar o webserver e então `npx playwright test`. 
  - Pra renovar Snapshots bases de QA após aprovação nova do Design System, use: `npx playwright test --update-snapshots`.
- **`npm run ai:eval`** → Executa offline a bateria Harness de Invariantes e Auditoria Lógica do Prompt Registry testando heurísticas contra PII e Injections em modo sandboxed gerando Score, atrelando output no Database (ou falha persistindo um `.json` seguro em `artifacts/`).

## Estrutura de Pastas Fundamental

* **`/src/app/`**: Rotas públicas do App Router, Side-bars Web do Cockpit (Protected pages) e Endpoints de API internas `/api/internal/...` com gatekeepers via Token.
* **`/src/core/`**: O domínio vital.
  * `/ai/` → O Proxy LLM, `prompt-registry` versão base de banco, `pii-redactor`, `eval-runner`.
  * `/events/` → Toda infraestrutura custom baseada em ioredis streams (`publish`, `consume`, `DLQ`).
* **`/src/drizzle/`**: Schema final consolidado, queries mapeadas.
* **`/src/infra/`**: Conexões ao DB, Redis, Loggers e repositórios padronizados.
* **`/src/styles/`**: Infraestrutura oficial de Ui System Tokens (Escalas CSS e Fontes).
* **`/src/ui/`**: Componentes da UI para a web, agnósticas (Dashboard Views).
* **`/src/workers/`**: Processadores background standalone isoláveis em infra.
* **`/docs/`**: Histórico documental, Logs de Decisão Arquitetural e Walkthroughs.
* **`/artifacts/`**: Saída git-safed despendiosa temporária não crucial ou arquivos de outputs dos evals.

***

_Condstore OS AI Platform Development - 2026_
