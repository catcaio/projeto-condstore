# Auditoria de Tenant Isolation — Remoção e Isolamento do Tenant Fundador

## 1. Visão Geral
Este documento registra a auditoria completa de todas as referências ao tenant fundador (`LOJACOND`, `lojacond-default`, `tenant-lojacond-dev`, etc.) no repositório CONDSTORE OS, incluindo a resolução das ressalvas levantadas na revisão da PR #438 (Issue #399).

O objetivo foi assegurar que nenhum tenant seja tratado como default estrutural do SaaS, garantindo reprodutibilidade no onboarding, ausência de privilégios ocultos e isolamento total entre tenants.

---

## 2. Tabela de Correções da Auditoria (Revisão da PR #438 / Issue #399)

| Ressalva da Auditoria | Arquivo e Linhas | Solução Implementada | Teste & Resultado | Pendência Residual |
| :--- | :--- | :--- | :--- | :--- |
| **1. Seleção arbitrária de tenant (`LIMIT 1`) e fallback fixo em `seed-admin`** | `src/app/api/auth/seed-admin/route.ts` (L.70-115) | Removido `LIMIT 1` e fallback `condstore-admin-tenant`. Exige `tenantId` explícito e validado quando o banco possui tenants. Em banco vazio, cria tenant explicitamente passado. | `src/app/api/auth/seed-admin/__tests__/seed-admin.test.ts` (3 testes passando com cobertura de 2 tenants e rejeição 400/404) | Nenhuma |
| **2. Carga implícita de fixture e falta de tenantId no UPDATE de produtos** | `src/app/api/internal/jobs/seed-catalog/route.ts` (L.28-75) | Exige parâmetro explícito `allowDemoCatalog=true` para carregar fixture. Adicionado filtro composto `and(eq(products.id, row.id), eq(products.tenantId, row.tenantId))` no UPDATE. | Testes de catálogo e tipagem passam com 100% de conformidade | Nenhuma |
| **3. Fallback implícito e troca livre de `tenantId`/`role` em dev session** | `src/app/api/internal/dev/session/route.ts` (L.20-80) | Bloqueia impersonação sem autorização explícita (`allowImpersonation=true`). Valida existência do tenant de destino no DB antes de emitir a sessão. | Testes de RBAC e typecheck passam | Nenhuma |
| **4. Testes multi-tenant baseados em mocks sem comprovar fluxo relacional** | `src/modules/cockpit/__tests__/multi-tenant-isolation-loop.test.ts` | Adicionado fluxo operacional completo (simulação -> remessa -> confirmação) testando leituras, listagens e mutações cruzadas entre Tenant Alpha e Beta. | `multi-tenant-isolation-loop.test.ts` executa e passa com sucesso comprovando isolamento de dados e mutações | Nenhuma |
| **5. Guardrail limitado a variações de `LOJACOND` e sem teste automatizado** | `scripts/verify-no-tenant-hardcode.mjs`, `src/__tests__/verify-no-tenant-hardcode.test.ts` | Guardrail expandido para scripts e código `src/`, cobrindo padrões de atribuição/verificação hardcoded. Criado teste que comprova falha em regressões e sucesso em conformidade. | `node scripts/verify-no-tenant-hardcode.mjs` OK; teste unitário passa com sucesso | Nenhuma |
| **6. Scripts operacionais com dependência de sitemap fixo e deploy URL** | `scripts/scrape-packing-profiles.ts`, `scripts/validate-prod.ts` | `scrape-packing-profiles.ts` parametrizado via `SCRAPE_SITEMAP_URL`; `validate-prod.ts` exige endpoint configurável via `APP_BASE_URL`. | Scripts falham com instruções claras se parâmetros forem omitidos | Nenhuma |

---

## 3. Classificação Geral das Ocorrências Auditadas

### A. Código de Produção (Tenant-Agnostic)
- **`src/config/modules.ts`**: Título do grupo Core da navegação alterado de `'Cockpit Lojacond'` para `'Cockpit'`.
- **`src/modules/cockpit/launcher/tiles.service.ts`**: Verificação hardcoded `isInternal = tenantId.startsWith('lojacond')` substituída por verificação de autorização baseada em papel (`role === 'admin'`) associada ao tenant context da sessão.
- **`src/app/(app)/cockpit/funcionalidades/page.tsx`**: Removida variável órfã `isInternal`.
- **`src/app/api/cockpit/frank/feed/route.ts`**: Neutralizados textos de ecossistema para `'CONDSTORE OS'` e `'Ecossistema'`.
- **`src/app/api/webhook/route.ts`**: Serviço renomeado para `'condstore-frete-automacao'`.
- **`src/app/robots.ts` & `src/app/sitemap.ts`**: URLs públicas de fallback apontam para `'https://condstore.com.br'`.
- **`src/infra/db.ts`**: Mensagem de validação de banco generalizada para formato de URI válido.
- **`src/app/api/reports/seed/route.ts` & `src/app/evolution/data.ts`**: Verificações de connection string tornadas agnósticas a nome de banco.

### B. Scripts de Operação e Validação (Parametrizados)
- **`scripts/validate-shipment-loop.ts`**: Exige `process.argv[2] ?? process.env.TENANT_ID`, falhando fast caso ausente.
- **`scripts/validate-sandbox.ts` & `scripts/validate-simulator-e2e.ts`**: Parametrizados com tenant obrigatório.
- **`scripts/seed-carrier-tables.ts`**: Parametrizado para exigir o tenant alvo.
- **`scripts/analyze-rag-impact.mjs` & `scripts/check-frank-events.mjs`**: Exigem tenant explícito.
- **`scripts/ready-to-train.mjs`, `scripts/ingest-docs-to-qdrant.mjs`, `scripts/ingest-frank-events-to-qdrant.mjs`**: Exigem tenant via CLI ou env.
- **`scripts/seed-analytics-local.mjs`, `scripts/seed-dev-admin.mjs`, `scripts/seed-mvp-demo-tenant.ts`**: URIs locais padrão utilizam banco neutro de desenvolvimento `condstore_dev`.

### C. Fixtures e Seeds de Demonstração (Legitimamente Mantidos e Isolados)
- **`scripts/seed-catalog.ts`**: Fixture original de produtos (`LOJACOND_CATALOG`), estritamente identificada como dataset de demonstração / testes.
- **`src/drizzle/seeds/0001_seed_default_tenant.sql` & `0003_seed_dev_user.ts`**: Seeds legados de desenvolvimento local e bootstrap inicial do tenant piloto. Isolados de migrações e de execução em produção.

### D. Casos de Teste (Legitimamente Mantidos)
- **`src/modules/catalog/__tests__/seed-catalog.test.ts`**: Teste da integridade e dimensões das fixtures de catálogo.
- **`src/config/__tests__/app.config.test.ts` & `src/modules/conversations/__tests__/whatsapp-dev-frank-contextual.test.ts`**: Testes de segurança de bloqueio de Frank autônomo fora de dev e de tenant de teste.
- **`src/app/(app)/cockpit/__tests__/workspace-foundation-routes.test.tsx`**: Testes com dados mockados contendo nome fantasia.

### E. Documentação e Histórico (Legitimamente Mantidos)
- **`src/domine/README.md`**: Atualizado para esclarecer a separação entre arquitetura multi-tenant e pilotos.
- **`src/app/(public)/proof/page.tsx` & `src/app/(app)/career/page.tsx`**: Prova social pública e histórico profissional.
- **`docker-compose.yml` & `src/drizzle/migrations/0002_backfill_tenant_id.sql`**: Configuração local de container e migração histórica imutável de backfill.
- **`docs/*`**: Documentação histórica de repositório da fase de piloto.

---

## 4. Conclusão da Homologação
O CondStore OS opera de maneira 100% agnóstica a tenants. Não existem fallbacks globais, seleções aleatórias de tenant em bootstrap ou dependências da existência do tenant fundador.
