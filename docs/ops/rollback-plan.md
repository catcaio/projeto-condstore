# Plano de Rollback — Go-Live Lote 1

**Data:** 2026-03-17

---

## Componentes e Procedimentos de Rollback

### 1. App (Vercel)

**Procedimento:**
1. Abrir [Vercel Dashboard → Deployments](https://vercel.com/dashboard)
2. Localizar o deployment anterior ao go-live (pelo commit SHA)
3. Clicar "Promote to Production"
4. Aguardar propagação (< 60s)
5. Verificar `/api/health` retornando 200

**Tempo estimado:** < 2 minutos

**Alternativa (CLI):**
```bash
# Listar deployments
npx vercel ls projeto-condstore --prod

# Promote deployment específico
npx vercel promote <deployment-url> --yes
```

---

### 2. Variáveis de Ambiente (Vercel)

**Procedimento:**
1. As envs de produção estão salvas localmente em `.env.vercel.production`
2. Se necessário restaurar envs anteriores:

```powershell
# Backup das envs atuais antes de qualquer modificação
npx vercel env pull .env.vercel.production.backup --environment production

# Restaurar envs do backup local
node scripts/deploy-env.mjs
```

**Pós-rollback:** Verificar que variáveis críticas estão corretas:
- `DATABASE_URL` aponta para TiDB Cloud prod
- `REDIS_URL` aponta para Upstash
- `TWILIO_AUTH_TOKEN` setado
- `STRIPE_WEBHOOK_SECRET` setado

---

### 3. Webhook Twilio

**Procedimento para PAUSAR entrada de WhatsApp:**
1. Abrir [Twilio Console → Messaging → Sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)
2. Alterar "WHEN A MESSAGE COMES IN" URL para:
   - **Pausa:** remover URL ou apontar para URL inexistente
   - **Staging:** `https://condstore-staging-bot.loca.lt/api/webhook`
   - **Produção:** `https://app.condstoreos.com/api/webhook`
3. Salvar

**Tempo estimado:** < 1 minuto

---

### 4. Workers

**Procedimento para PARAR todos os workers:**

```powershell
# Listar processos de workers
Get-Process -Name "node" | Where-Object { 
    $_.CommandLine -match "worker|domine" 
} | Format-Table Id, ProcessName, CommandLine

# Parar gracefully (SIGTERM → drain 8s → exit)
Get-Process -Name "node" | Where-Object { 
    $_.CommandLine -match "worker|domine" 
} | Stop-Process

# Verificar que pararam
Get-Process -Name "node" | Where-Object { 
    $_.CommandLine -match "worker|domine" 
}
```

**Procedimento para REINICIAR com env anterior:**
```powershell
# Reiniciar workers com env de staging/development
node --env-file=.env.local --import tsx src/workers/finops-worker.ts
node --env-file=.env.local --import tsx src/workers/quote-worker.ts
node --env-file=.env.local --import tsx src/workers/queue-worker.ts
```

---

### 5. Automações (Frank)

**Procedimento para DESABILITAR Frank imediato:**
1. No Vercel Dashboard → Environment Variables:
   - Set `FRANK_RUNTIME_ENABLED=false`
2. Redeploy (ou o próximo deploy já pegará)

**Nota:** Frank já vai iniciar desligado no Lote 1. Este procedimento é para caso alguém ligue durante as 48h.

---

## Sequência de Rollback Completo

```
SITUAÇÃO: Incidente crítico detectado

1. PAUSAR ENTRADA (30s)
   → Remover URL do webhook no Twilio Console

2. PARAR WORKERS (30s)
   → Stop-Process nos workers node

3. ROLLBACK APP (2min)
   → Vercel promote deployment anterior

4. VERIFICAR SAÚDE (1min)
   → curl /api/health → deve retornar 200

5. AVALIAR DADOS (5min)
   → Verificar integridade: mensagens não duplicadas, 
     billings não corrompidos, fila limpa
   → Logs do DOMINE para events pendentes

6. DECISÃO
   → Dados íntegros → manter rollback, investigar
   → Dados corrompidos → acionar recovery scripts
```

## Integridade de Dados

O rollback de deploy **não afeta dados no banco**. Mensagens já persistidas em `whatsapp_messages`, billing em `stripe_events`, e eventos no DOMINE permanecem intactos.

Se jobs ficarem stuck no DOMINE:
```sql
-- Verificar events pendentes
SELECT COUNT(*) FROM domine_events WHERE status = 'pending';

-- Limpar events stuck (com cautela)
UPDATE domine_events SET status = 'failed' WHERE status = 'pending' AND created_at < NOW() - INTERVAL 1 HOUR;
```

---

## Checklist de Teste de Rollback (pré go-live)

- [ ] Vercel: deployment anterior existe e pode ser promoted
- [ ] Envs: `.env.vercel.production` backup local está atualizado
- [ ] Twilio: URL do webhook pode ser alterada rapidamente
- [ ] Workers: processos respondem a Stop-Process
- [ ] Health: endpoints retornam 200 após rollback simulado
- [ ] DOMINE: sem events stuck ou em estado inconsistente
