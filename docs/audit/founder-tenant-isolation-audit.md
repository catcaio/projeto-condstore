# Auditoria de Tenant Isolation — Remoção e Isolamento do Tenant Fundador

## 1. Visão Geral
Este documento registra a auditoria completa de todas as referências ao tenant fundador (`LOJACOND`, `lojacond-default`, `tenant-lojacond-dev`, etc.) no repositório CONDSTORE OS. O objetivo foi assegurar que nenhum tenant seja tratado como default estrutural do SaaS, garantindo reprodutibilidade no onboarding e isolamento total entre tenants.

## 2. Classificação das Ocorrências

### A. Código de Produção (Modificados para serem Tenant-Agnostic)
- **`src/config/modules.ts`**: Título do grupo Core da navegação continha `'Cockpit Lojacond'`. Alterado para `'Cockpit'`.
- **`src/modules/cockpit/launcher/tiles.service.ts`**: Verificação hardcoded `isInternal = tenantId.startsWith('lojacond')` usada para exibir badges de DLQ e modo incidente. Substituída por verificação de permissão baseada em papel (`role === 'admin'`) com tenant context do usuário autenticado.
- **`src/app/(app)/cockpit/funcionalidades/page.tsx`**: Removida variável órfã `isInternal`.
- **`src/app/api/cockpit/frank/feed/route.ts`**: Textos hardcoded `"Atualizações do Ecossistema Lojacond"` e `"Análise Preditiva Lojacond"` alterados para termos neutros do sistema (`"Atualizações do Ecossistema"` e `"Análise Preditiva Operacional"`).
- **`src/app/api/webhook/route.ts`**: Identificador de serviço `"lojacond-frete-automacao"` alterado para `"condstore-frete-automacao"`.
- **`src/app/robots.ts` & `src/app/sitemap.ts`**: Fallback de URL pública alterado de `'https://lojacond.com.br'` para `'https://condstore.com.br'`.
- **`src/infra/db.ts`**: Mensagem de erro de infraestrutura exigindo especificamente `"/lojacond"` generalizada para verificar qualquer database name válido na URI.
- **`src/app/api/auth/seed-admin/route.ts`**: Validação de URL de conexão de banco (`dbUrl.includes('/lojacond')`) generalizada para validação estrutural do path da URL.
- **`src/app/api/reports/seed/route.ts` & `src/app/evolution/data.ts`**: Verificações hardcoded de `dbUrl.includes('/lojacond')` substituídas por checagem agnóstica de path na URL do banco.
- **`src/app/api/internal/jobs/seed-catalog/route.ts`**: Rota parametrizada para receber obrigatoriamente `tenantId` via query param ou cabeçalho, falhando com 400 se ausente, sem fallback para `LOJACOND_TENANT_ID`.
- **`src/app/api/internal/dev/session/route.ts`**: Sessão de desenvolvimento parametrizada via `tenantId` query param ou `DEV_DEFAULT_TENANT_ID` (default `condstore-dev-tenant`), sem acoplamento a `'LOJACOND'`.

### B. Scripts de Operação e Validação (Parametrizados)
- **`scripts/validate-shipment-loop.ts`**: Removido `tenantId = 'LOJACOND'`. O script agora lê `process.argv[2] ?? process.env.TENANT_ID`, falhando com código de erro 1 e mensagem explícita caso nenhum tenantId seja informado.
- **`scripts/validate-prod.ts`**: Parametrizado com falha obrigatória se `tenantId` estiver ausente.
- **`scripts/validate-sandbox.ts`**: Parametrizado com falha obrigatória se `tenantId` estiver ausente.
- **`scripts/validate-simulator-e2e.ts`**: Parametrizado com falha obrigatória se `tenantId` estiver ausente.
- **`scripts/seed-carrier-tables.ts`**: Parametrizado para exigir tenant alvo (`process.argv[2] ?? process.env.TENANT_ID`).
- **`scripts/analyze-rag-impact.mjs` & `scripts/check-frank-events.mjs`**: Exigem argumento de tenant obrigatório.
- **`scripts/ready-to-train.mjs`, `scripts/ingest-docs-to-qdrant.mjs`, `scripts/ingest-frank-events-to-qdrant.mjs`**: Exigem tenant via argumento ou env.
- **`scripts/scrape-packing-profiles.ts`**: Exige `SCRAPE_TENANT_ID` sem default hardcoded.
- **`scripts/seed-analytics-local.mjs`, `scripts/seed-dev-admin.mjs`, `scripts/seed-mvp-demo-tenant.ts`**: Fallbacks locais de URI apontam para database `condstore_dev`.

### C. Fixtures e Seeds de Demonstração (Legitimamente Mantidos e Isolados)
- **`scripts/seed-catalog.ts`**: Contém o dataset de produtos original (`LOJACOND_CATALOG`), exportado como fixture/dataset de demonstração para testes e importação sob demanda em qualquer tenant.
- **`src/drizzle/seeds/0001_seed_default_tenant.sql` & `0003_seed_dev_user.ts`**: Seeds legados de desenvolvimento local e bootstrap inicial do tenant piloto. Isolados de migrações e de execução em produção.

### D. Casos de Teste (Legitimamente Mantidos)
- **`src/modules/catalog/__tests__/seed-catalog.test.ts`**: Valida a integridade matemática e dimensional das fixtures do catálogo de demonstração.
- **`src/config/__tests__/app.config.test.ts` & `src/modules/conversations/__tests__/whatsapp-dev-frank-contextual.test.ts`**: Validação de segurança estrita da flag de desenvolvimento `isFrankDevAutonomousEnabled` (que exige `NODE_ENV === 'development'` e tenant explícito de dev `tenant-lojacond-dev`, comprovando que produção bloqueia qualquer execução autônoma não supervisionada).
- **`src/app/(app)/cockpit/__tests__/workspace-foundation-routes.test.tsx`**: Testes com dados mockados contendo nome fantasia.

### E. Documentação e Histórico (Legitimamente Mantidos)
- **`src/domine/README.md`**: Atualizado para esclarecer a separação de responsabilidades (infraestrutura SaaS agnóstica vs. pilotos).
- **`src/app/(public)/proof/page.tsx` & `src/app/(app)/career/page.tsx`**: Página pública de marketing contendo estudo de caso / prova social da loja fundadora e currículo profissional.
- **`docker-compose.yml` & `src/drizzle/migrations/0002_backfill_tenant_id.sql`**: Configuração local de container e migração histórica imutável de backfill.
- **`docs/*`**: Documentação histórica de repositório, manuais e playbooks da fase de piloto.

## 3. Conclusão da Auditoria
Nenhum módulo ou serviço executável em produção depende do tenant fundador como default estrutural. Todas as operações com escopo de tenant resolvem o `tenantId` estritamente a partir do contexto de sessão, headers autenticados ou parâmetros explícitos validados.
