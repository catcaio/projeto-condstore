# Sprint 1.6 Multi-Tenant: Arquivos Modificados

## Migrations e Seeds

### Criados
- `src/drizzle/migrations/0001_add_multi_tenant.sql` - Cria tabela tenants e adiciona colunas tenant_id
- `src/drizzle/migrations/0002_backfill_tenant_id.sql` - Backfill de dados existentes com tenant default
- `src/drizzle/migrations/0003_enforce_tenant_id.sql` - Torna tenant_id NOT NULL e adiciona foreign keys
- `src/drizzle/seeds/0001_seed_default_tenant.sql` - Seed do tenant default Lojacond

## Schema e Repositórios

### Modificados
- `src/drizzle/schema.ts`
  - Adicionada tabela `tenants` com tipos TypeScript
  - Adicionado campo `tenantId` em `messages` table
  - Adicionado campo `tenantId` em `simulations` table

### Criados
- `src/infra/repositories/tenant.repository.ts`
  - Repositório de tenants com cache in-memory (TTL 10 min)
  - Método `getTenantByTwilioNumber()` com fallback para DB
  - Método `getTenantById()`
  - Métodos de invalidação de cache

### Modificados
- `src/infra/repositories/message.repository.ts`
  - `saveInboundMessage()` - Requer e valida `tenant_id`
  - `getMetricsToday()` - Requer `tenant_id` e filtra por ele
  - `getMetricsTotal()` - Requer `tenant_id` e filtra por ele
  - Todos os métodos lançam erro se `tenant_id` ausente

- `src/infra/repositories/simulation.repository.ts`
  - `saveSimulation()` - Requer e valida `tenant_id`
  - `getRecentSimulations()` - Requer `tenant_id` e filtra por ele
  - `getMetrics()` - Requer `tenant_id` e filtra por ele
  - `countTotal()` - Requer `tenant_id` e filtra por ele
  - `countToday()` - Requer `tenant_id` e filtra por ele
  - Todos os métodos lançam erro se `tenant_id` ausente

## Session Manager

### Modificados
- `src/core/conversation/session-manager.ts`
  - Atualizado formato de chave: `session:${tenantId}:${phoneNumber}`
  - Adicionado `tenantId` ao `SessionData` interface
  - Todos os métodos públicos agora requerem `tenantId`:
    - `getSession(tenantId, phoneNumber)`
    - `createSession(tenantId, phoneNumber)`
    - `updateSession(tenantId, phoneNumber, updates)`
    - `deleteSession(tenantId, phoneNumber)`
    - `sessionExists(tenantId, phoneNumber)`
    - `getSessionTTL(tenantId, phoneNumber)`
    - `extendSession(tenantId, phoneNumber)`
  - **Compatibility Layer**: Detecta chaves antigas, registra evento `session_reset`, deleta sessão antiga e força recriação

## API Routes

### Modificados
- `src/app/api/webhook/route.ts`
  - Importado `tenantRepository`
  - Adicionada resolução de tenant por número Twilio (`To` field)
  - Retorna 400 se número Twilio desconhecido
  - Passa `tenantId` para persistência de mensagem
  - Logs incluem `tenantId` em todas as operações

- `src/app/api/metrics/overview/route.ts`
  - Requer query parameter `tenant_id`
  - Retorna 400 se `tenant_id` ausente
  - Filtra todas as métricas por `tenant_id`
  - Inclui `tenantId` na resposta JSON

## Documentação

### Criados
- `TESTING_CHECKLIST.md` - Checklist completo de testes manuais com 6 cenários
- `CHANGES_SUMMARY.md` - Este arquivo

## Resumo de Mudanças

### Database
- ✅ Tabela `tenants` criada
- ✅ Campo `tenant_id` adicionado a `messages` e `simulations`
- ✅ Migrations criadas (3 arquivos)
- ✅ Seed do tenant default criado
- ✅ Script de backfill criado

### Backend
- ✅ Tenant repository com cache (TTL 10 min)
- ✅ Todos os repositórios requerem `tenant_id`
- ✅ Nenhuma query funciona sem `tenant_id`
- ✅ Session manager usa chaves tenant-scoped
- ✅ Compatibility layer para sessões antigas
- ✅ Webhook resolve tenant por número Twilio
- ✅ Erro 400 para números desconhecidos

### API
- ✅ Métricas requerem `tenant_id` query param
- ✅ Webhook integrado com tenant resolution
- ✅ Logs incluem `tenant_id` em todas as operações

## Pontos de Risco Mitigados

1. **Dados existentes sem tenant_id**
   - ✅ Migração 0002 faz backfill com tenant default
   - ✅ Migração 0003 torna campo NOT NULL após backfill

2. **Sessões antigas com formato antigo**
   - ✅ Compatibility layer detecta e invalida
   - ✅ Evento `session_reset` registrado em logs
   - ✅ Usuários precisam reiniciar conversa (esperado)

3. **Performance de lookup de tenant**
   - ✅ Cache in-memory com TTL de 10 minutos
   - ✅ DB como fonte da verdade
   - ✅ Configurável via `TENANT_CACHE_TTL_MINUTES`

4. **Queries sem tenant_id**
   - ✅ TypeScript força parâmetro `tenant_id`
   - ✅ Runtime validation lança erro explícito
   - ✅ Nenhum fallback silencioso

## Próximos Passos

1. **Executar migrations** no banco de dados local/staging
2. **Executar seed** do tenant default
3. **Executar backfill** de dados existentes
4. **Testar** usando o checklist em `TESTING_CHECKLIST.md`
5. **Configurar** segundo número Twilio para teste multi-tenant
6. **Validar** isolamento de dados entre tenants
7. **Deploy** para produção após validação completa

## Comandos de Execução

```bash
# 1. Executar migrations
mysql -u user -p database < src/drizzle/migrations/0001_add_multi_tenant.sql
mysql -u user -p database < src/drizzle/seeds/0001_seed_default_tenant.sql
mysql -u user -p database < src/drizzle/migrations/0002_backfill_tenant_id.sql
mysql -u user -p database < src/drizzle/migrations/0003_enforce_tenant_id.sql

# 2. Verificar
mysql -u user -p database -e "SELECT * FROM tenants;"
mysql -u user -p database -e "SELECT tenant_id, COUNT(*) FROM messages GROUP BY tenant_id;"
mysql -u user -p database -e "SELECT tenant_id, COUNT(*) FROM simulations GROUP BY tenant_id;"

# 3. Rodar aplicação
npm run dev

# 4. Testar webhook
# Ver TESTING_CHECKLIST.md para comandos de teste
```

## Configuração de Ambiente

Adicionar ao `.env`:

```env
# Tenant cache TTL (opcional, padrão: 10 minutos)
TENANT_CACHE_TTL_MINUTES=10
```

## Notas Importantes

- **Sem fallback para tenant padrão**: Números desconhecidos retornam erro 400
- **Sessões antigas invalidadas**: Usuários precisam reiniciar conversas após deploy
- **Cache configurável**: TTL ajustável via variável de ambiente
- **DB como fonte da verdade**: Cache é apenas otimização, DB sempre consultado após expiração
