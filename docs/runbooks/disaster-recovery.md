# Disaster Recovery Runbook

**Sistema**: Condstore OS  
**Última revisão**: 2026-03-06  
**Responsável**: Equipe de Infra / SRE

---

## 1. Cenários de Incidente

| ID | Cenário | Severidade |
|----|---------|-----------|
| DR-01 | Corrupção de dados no TiDB Cloud (drop acidental, migration errada) | P0 |
| DR-02 | Falha total de conectividade com banco de dados | P0 |
| DR-03 | Comprometimento de credenciais (DB, Redis, chaves de API) | P0 |
| DR-04 | Indisponibilidade total do Redis (sessões, rate-limit, locks) | P1 |
| DR-05 | Perda de artefatos de migration (drizzle/) no repositório | P1 |
| DR-06 | Falha de deploy no Vercel sem rollback automático | P1 |
| DR-07 | Corrupção do journal de migrations (_journal.json desalinhado) | P2 |
| DR-08 | Perda de variáveis de ambiente em produção | P2 |

---

## 2. Fontes de Backup

### 2.1 Banco de Dados (TiDB Cloud)
- **Backup automático**: TiDB Cloud realiza snapshots diários automáticos (retenção: 14 dias).
- **Backup pontual (PITR)**: habilitado via console TiDB Cloud — restauração granular por timestamp.
- **URL**: console em https://tidbcloud.com → projeto → Backup.
- **Export manual**: via `tiup dumpling` ou mysqldump com SSL.

### 2.2 Repositório Git (Migrations)
- Todos os artefatos de migration estão versionados em `drizzle/`.
- O journal `drizzle/meta/_journal.json` é a fonte de verdade do estado de schema.
- **Verificação de drift**: `npm run db:verify` detecta schema não commitado.

### 2.3 Redis (Upstash)
- Redis é **stateless por design** neste sistema (sessões, locks, rate-limit têm TTL curtos).
- Dados de sessão expiram em ≤ 24h; a perda total do Redis é recuperável com reconexão automática.
- **Backup Upstash**: via console Upstash → Backups (se habilitado no plano).

### 2.4 Variáveis de Ambiente
- `.env.production` versionado **sem segredos** (apenas keys não-sensíveis).
- Segredos críticos armazenados no Vercel Environment Variables.
- **Inventário de envs**: `scripts/check-env-leak.mjs` valida ausência de vazamento.

### 2.5 Artefatos de Deploy
- Builds são mantidos no Vercel por 30 dias.
- Rollback de deploy: `vercel rollback` no CLI ou via console.

---

## 3. Ordem de Recuperação

### DR-01 / DR-02 — Falha de Banco

1. **Triage**: executar `GET /api/internal/health/db` com token interno.
2. **Isolar**: desabilitar rotas de escrita via `MAINTENANCE_MODE=1` se necessário.
3. **Restaurar snapshot**: no console TiDB Cloud → Backup → Restore from snapshot.
4. **Restar migration state**: após restore, executar `npm run db:verify` para confirmar alinhamento.
5. **Validar integridade**: executar `node scripts/run-recovery-check.mjs` ou `GET /api/internal/diag/recovery`.
6. **Reativar**: remover `MAINTENANCE_MODE`, monitorar logs por 15 min.

### DR-03 — Credenciais Comprometidas

1. **Revogar imediatamente**: rotacionar `DATABASE_URL`, `REDIS_URL`, `INTERNAL_DIAG_TOKEN`, `INTERNAL_JOB_TOKEN`, `INTERNAL_EXPORT_TOKEN`, `QA_BOOTSTRAP_TOKEN`.
2. **Atualizar no Vercel**: Vercel Dashboard → Settings → Environment Variables.
3. **Revogar sessões**: incrementar `sessionVersion` de todos os usuários via `POST /api/tenants/:id/settings`.
4. **Verificar audit log**: `admin_audit_log` — buscar ações suspeitas nas últimas 24h.
5. **Redeploy**: `vercel --prod` para propagar novas envs.

### DR-04 — Redis Indisponível

1. Redis é não-crítico para leitura de dados; sessões serão invalidadas mas o sistema continua.
2. Rate-limit fará **fallback ativo** (ver `getRateLimiterFallbackMetrics()`).
3. Aguardar recuperação Upstash ou apontar para nova instância via `REDIS_URL`.
4. Verificar `GET /api/internal/health/redis`.

### DR-05 — Perda de Artefatos de Migration

1. Restaurar via `git checkout` do commit anterior com os arquivos `drizzle/`.
2. Se necessário, recriar migration manualmente a partir do snapshot JSON anterior.
3. Executar `npm run db:verify` para confirmar alinhamento.

### DR-06 — Falha de Deploy

1. `vercel rollback --prod` para reverter para o deploy anterior.
2. Investigar logs de build no Vercel Dashboard.
3. Corrigir e redeploy via pipeline CI.

### DR-07 — Journal Desalinhado

1. Comparar `drizzle/meta/_journal.json` com o estado real do banco via `SHOW TABLES`.
2. Se banco está à frente do journal: adicionar entrada manual ao journal.
3. Se journal está à frente do banco: aplicar migrations pendentes via SQL direto.
4. Executar `npm run db:verify` após correção.

### DR-08 — Perda de Variáveis de Ambiente

1. Restaurar a partir do inventário seguro (Vault, 1Password, etc.).
2. Executar `node scripts/check-backup-sources.mjs` para validar presença de todas as envs críticas.
3. Redeploy.

---

## 4. Validações Pós-Restore

Executar em sequência após qualquer operação de restore:

```bash
# 1. Verificar fontes de backup e envs
node scripts/check-backup-sources.mjs

# 2. Verificar integridade completa
node --import tsx scripts/run-recovery-check.mjs

# 3. Verificar schema drift
npm run db:verify

# 4. Garantir que o endpoint de health responde
curl -H "x-internal-token: $INTERNAL_DIAG_TOKEN" \
  https://seu-dominio.vercel.app/api/internal/diag/recovery

# 5. Rodar suite de testes
npm run test:ci
```

### Checklist Pós-Restore

- [ ] `db_connection_ok: true`  
- [ ] `redis_connection_ok: true`  
- [ ] `migrations_in_sync: true`  
- [ ] `latest_migration_id: 48` (ou o mais atual)  
- [ ] `backup_envs_present: true`  
- [ ] `restore_check_ready: true`  
- [ ] Nenhum evento em `admin_audit_log` inesperado nas últimas 2h  
- [ ] Nenhum erro 5xx na última janela de 5 min (`security_edge_events`)  

---

## 5. Critérios de Sucesso e Falha

### Sucesso
- `run-recovery-check.mjs` retorna **PASS**
- Endpoint `/api/internal/diag/recovery` retorna todos os campos `true`
- `npm run test:ci` passa com 0 falhas
- Nenhuma regressão de 5xx nas rotas críticas (`/api/webhook`, `/api/tenants/:id/*`)

### Falha (triggers de escalonamento)
- `db_connection_ok: false` após 5 min de tentativa = escalar P0
- `migrations_in_sync: false` = não reativar produção
- `restore_check_ready: false` = iniciar DR-01 completo

---

## 6. Rollback do Restore

Se o restore piorar o estado:

1. Identificar snapshot anterior ao restore via console TiDB Cloud.
2. Executar restore do snapshot identificado.
3. Repetir validações pós-restore.
4. Registrar o incidente em `admin_audit_log` via API admin se possível, ou manualmente.
5. Abrir post-mortem documentando a cadeia de eventos.

---

## 7. Contatos de Emergência

| Recurso | Contato / URL |
|---------|--------------|
| TiDB Cloud | https://tidbcloud.com — support ticket |
| Upstash Redis | https://upstash.com — support |
| Vercel | https://vercel.com/support |
| Endpoint de saúde | `GET /api/internal/diag` (token: `INTERNAL_DIAG_TOKEN`) |
| Recovery check | `GET /api/internal/diag/recovery` |
