# Sprint 1.6 Multi-Tenant: Manual Testing Checklist

## Pré-requisitos

1. ✅ Migrations executadas com sucesso
2. ✅ Seed do tenant default criado
3. ✅ Backfill de dados existentes concluído
4. ✅ Aplicação rodando localmente

---

## Teste 1: Tenant Único (Validação Básica)

### Setup
```sql
-- Verificar que o tenant default existe
SELECT * FROM tenants WHERE id = 'lojacond-default';

-- Verificar número Twilio configurado
SELECT id, name, twilio_number FROM tenants;
```

### Passos
1. **Enviar webhook de teste** para o número Twilio configurado
   - Usar Postman ou curl para simular webhook do Twilio
   - Incluir campo `To` com o número do tenant
   - Incluir assinatura Twilio válida

2. **Verificar resolução de tenant**
   - Checar logs para mensagem: `Tenant resolved`
   - Confirmar `tenantId` = `lojacond-default`

3. **Verificar persistência de mensagem**
   ```sql
   SELECT message_sid, tenant_id, from_phone, intent, created_at 
   FROM messages 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - Confirmar que `tenant_id` = `lojacond-default`

4. **Verificar chave de sessão no Redis**
   - Formato esperado: `session:lojacond-default:+5511999999999`
   - Usar Redis CLI ou Upstash console para verificar

### Resultado Esperado
- ✅ Tenant resolvido corretamente
- ✅ Mensagem persistida com `tenant_id`
- ✅ Sessão criada com chave no novo formato
- ✅ TwiML response retornado com sucesso

---

## Teste 2: Multi-Tenant (Isolamento de Dados)

### Setup
```sql
-- Criar segundo tenant para teste
INSERT INTO tenants (id, name, twilio_number, created_at)
VALUES ('tenant-test-2', 'Empresa Teste 2', '+14155238887', NOW());

-- Verificar ambos os tenants
SELECT id, name, twilio_number FROM tenants;
```

### Passos

#### 2.1 - Enviar mensagens para Tenant 1
1. Enviar webhook com `To=+14155238886` (tenant default)
2. Usar `From=+5511111111111`
3. Verificar logs: tenant resolvido = `lojacond-default`

#### 2.2 - Enviar mensagens para Tenant 2
1. Enviar webhook com `To=+14155238887` (tenant-test-2)
2. Usar **mesmo** `From=+5511111111111`
3. Verificar logs: tenant resolvido = `tenant-test-2`

#### 2.3 - Verificar isolamento de sessões
```bash
# No Redis, devem existir DUAS sessões diferentes:
session:lojacond-default:+5511111111111
session:tenant-test-2:+5511111111111
```

#### 2.4 - Verificar isolamento de mensagens
```sql
-- Mensagens do Tenant 1
SELECT COUNT(*) FROM messages WHERE tenant_id = 'lojacond-default';

-- Mensagens do Tenant 2
SELECT COUNT(*) FROM messages WHERE tenant_id = 'tenant-test-2';

-- Verificar que não há cross-contamination
SELECT DISTINCT tenant_id FROM messages;
```

### Resultado Esperado
- ✅ Duas sessões distintas criadas (mesmo telefone, tenants diferentes)
- ✅ Mensagens isoladas por tenant
- ✅ Nenhuma query retorna dados de outro tenant
- ✅ Conversas não se misturam

---

## Teste 3: Número Twilio Desconhecido (Erro 400)

### Passos
1. Enviar webhook com `To=+19999999999` (número não cadastrado)
2. Incluir assinatura Twilio válida

### Resultado Esperado
- ✅ Response HTTP 400
- ✅ Body: `{ "error": "Unknown Twilio number" }`
- ✅ Log de evento: `UNKNOWN_TENANT`
- ✅ Nenhuma mensagem persistida
- ✅ Nenhuma sessão criada

---

## Teste 4: Compatibilidade de Sessão (Migration Layer)

### Setup
```bash
# Criar sessão com formato antigo manualmente no Redis
# Chave: session:+5511222222222
# Valor: JSON de SessionData (sem tenantId)
```

### Passos
1. Enviar webhook para tenant default com `From=+5511222222222`
2. Verificar logs para evento: `session_reset`
3. Verificar que sessão antiga foi deletada
4. Verificar que nova sessão foi criada com formato: `session:lojacond-default:+5511222222222`

### Resultado Esperado
- ✅ Sessão antiga detectada
- ✅ Log de migração registrado
- ✅ Sessão antiga deletada
- ✅ Nova sessão criada com tenant_id
- ✅ Usuário precisa reiniciar conversa (comportamento esperado)

---

## Teste 5: Métricas por Tenant

### Passos
1. Enviar 3 mensagens para Tenant 1
2. Enviar 2 mensagens para Tenant 2
3. Chamar endpoint de métricas:
   ```bash
   GET /api/metrics/overview?tenant_id=lojacond-default
   GET /api/metrics/overview?tenant_id=tenant-test-2
   ```

### Resultado Esperado
- ✅ Tenant 1: `totalMessages` = 3
- ✅ Tenant 2: `totalMessages` = 2
- ✅ Métricas não se misturam
- ✅ Endpoint sem `tenant_id` retorna 400

---

## Teste 6: Cache de Tenant (Performance)

### Passos
1. Enviar primeira mensagem para tenant
   - Verificar log: `Tenant resolved from DB`
2. Enviar segunda mensagem para mesmo tenant (dentro de 10 min)
   - Verificar log: `Tenant found in cache`
3. Aguardar 11 minutos
4. Enviar terceira mensagem
   - Verificar log: `Tenant resolved from DB` (cache expirou)

### Resultado Esperado
- ✅ Primeira lookup: DB
- ✅ Lookups subsequentes: Cache (dentro do TTL)
- ✅ Após TTL: DB novamente
- ✅ Performance melhorada com cache

---

## Checklist Final de Validação

- [ ] Tenant único funciona corretamente
- [ ] Multi-tenant isola dados completamente
- [ ] Número desconhecido retorna erro 400
- [ ] Sessões antigas são migradas/invalidadas
- [ ] Métricas filtram por tenant
- [ ] Cache de tenant funciona com TTL
- [ ] Nenhuma query funciona sem `tenant_id`
- [ ] Logs incluem `tenant_id` em todas as operações
- [ ] Código compila sem erros TypeScript
- [ ] Testes automatizados passam (se existirem)

---

## Comandos Úteis

### Verificar dados no banco
```sql
-- Contar mensagens por tenant
SELECT tenant_id, COUNT(*) as total 
FROM messages 
GROUP BY tenant_id;

-- Contar simulações por tenant
SELECT tenant_id, COUNT(*) as total 
FROM simulations 
GROUP BY tenant_id;

-- Verificar tenants cadastrados
SELECT * FROM tenants;
```

### Verificar sessões no Redis
```bash
# Listar todas as chaves de sessão
KEYS session:*

# Ver conteúdo de uma sessão
GET session:lojacond-default:+5511999999999
```

### Simular webhook Twilio
```bash
curl -X POST http://localhost:3000/api/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Twilio-Signature: <signature>" \
  -d "MessageSid=SM123456" \
  -d "From=whatsapp:+5511999999999" \
  -d "To=whatsapp:+14155238886" \
  -d "Body=Olá, quero um orçamento"
```

---

## Notas Importantes

1. **Assinatura Twilio**: Para testes locais, pode ser necessário desabilitar temporariamente a validação de assinatura ou usar ngrok para expor localhost.

2. **TTL do Cache**: Configurável via `TENANT_CACHE_TTL_MINUTES` (padrão: 10 minutos).

3. **Sessões Antigas**: Serão automaticamente invalidadas na primeira interação após o deploy. Usuários precisarão reiniciar conversas.

4. **Backfill**: Todos os dados existentes devem ter `tenant_id = 'lojacond-default'` após migração.
