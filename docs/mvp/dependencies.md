# MVP CONDSTORE OS — Dependências externas

**Descrição:** O que o MVP depende para funcionar. O que acontece se cada dependência falhar.

---

## Visão geral de criticidade

| Dependência | Tipo | Criticidade | Status em falha |
|---|---|---|---|
| **Twilio** | Serviço externo | 🔴 Crítica | Webhooks param |
| **Banco de dados** | Infraestrutura | 🔴 Crítica | Sistema down |
| **Melhor Envio API** | Serviço externo | 🟡 Alta | Fallback para tabelas |
| **Redis** | Infraestrutura | 🟡 Alta | Fila degrada, async lento |
| **Carrier tables** | Dados estáticos | 🟢 Baixa | Melhor Envio cobre |

---

## Twilio — WhatsApp Business API

**Responsabilidade:** Receber mensagens do WhatsApp e enviar respostas

**Como funciona no MVP:**
- Twilio sends webhook `POST /api/whatsapp/incoming` quando mensagem chega
- MVP valida signature e processa payload
- MVP responde via Twilio API

**O que acontece se falhar:**
- ❌ Webhooks não chegam
- ❌ Operador não vê mensagens novas
- ✅ Dados já recebidos (conversas, mensagens) continuam visíveis
- ✅ Sistema continua operacional para pedidos/logística

**Recuperação:**
- Automática quando Twilio voltar
- Webhook pode ficar em retry (Twilio native)
- Nenhuma ação manual necessária

**Monitoramento:**
- Verificar se webhooks estão chegando (cron job ou alertas)
- Taxa de erro de assinatura deve ser < 1%

---

## Banco de dados (MySQL via Drizzle ORM)

**Responsabilidade:** Persistência de todas as operações (orders, conversations, customers, etc.)

**Como funciona:**
- Todo dado crítico é persistido em TiDB/MySQL
- Drizzle ORM gerencia schema e queries
- Migrations controladas via `drizzle-kit`

**O que acontece se falhar:**
- ❌ Nenhum novo dado pode ser escrito
- ❌ Consultas falham (inbox, pedidos, logística ficam vazios)
- ❌ Sistema inteiro fica indisponível para escrita
- ✅ Dados já persistidos estão salvos (não se perdem)

**Recuperação:**
- Replicação automática em produção
- Backup diário (operacional)
- Recovery time: 5-10 minutos typicamente

**Monitoramento:**
- Alertas de connection pool exhausted
- Query latency percentiles (p99 < 1s)
- Disk space remaining

**Dados críticos persistidos:**
- `conversations` (WhatsApp sessions)
- `messages` (encrypted)
- `orders` (order header + items)
- `freight_simulations` (quotes)
- `customers` (CRM)
- `freight_shipments` (carrier linkage)

---

## Melhor Envio API — Serviço de frete externo

**Responsabilidade:** Consultar preços e prazos reais de múltiplos carriers

**Como funciona:**
- Quando operador solicita cotação, `freight-engine` chama Melhor Envio em paralelo com carriers de tabela
- Retorna as opções mais baratas/rápidas
- Integração via `MELHORENVIO_TOKEN` (env var)

**O que acontece se falhar:**
- ❌ Cotações via Melhor Envio indisponíveis
- ✅ Sistemas fallback para carriers de tabela (Movvi, Mengue, Braspress)
- ✅ Operador consegue cotar (com menos opções)
- ✅ Nenhuma perda de dados

**Degradação graceful:**
```
Quote engine: Promise.allSettled([
  melhorEnvio(),     // falha → rejected
  movvi(),           // sucesso → opção 1
  mengue(),          // sucesso → opção 2
  braspress()        // sucesso → opção 3
])

Resultado: 3 opções de carriers de tabela, sem Melhor Envio
```

**Recuperação:**
- Automática quando Melhor Envio voltar
- Nenhuma ação manual necessária

**Monitoramento:**
- Taxa de falha de Melhor Envio > 5% = alertar
- Timeout para chamada: 5s (se exceder, falha graceful)

**Risco:**
- Se Melhor Envio cair frequentemente, foco fica em carriers de tabela (menos opções para cliente)

---

## Redis — Cache e fila de eventos

**Responsabilidade:** Cache de sessões, fila de processamento async (DOMINE event bus)

**Como funciona:**
- Redis armazena JWT sessions + rate-limit counters
- Event processor usa Redis para fila de eventos assíncronos
- Fallback em caso de falha: nenhum (crítico para Lote 1)

**O que acontece se falhar:**
- ⚠️ Sessões podem ser resetadas (usuários deslogam)
- ⚠️ Event queue acumula na memória (sem persistência)
- ⚠️ Rate limit não funciona (pode abrir brecha)
- ❌ DOMINE processor paralisa (eventos queimam)

**Degradação graceful:**
- Session: pode usar memória local (não recomendado em produção)
- Event queue: perde eventos em queue (data loss)
- Rate limit: sem proteção (risco de abuse)

**Recuperação:**
- Replicação Redis em master-replica
- Backup à memória (não recomendado)
- RTO: 2-5 minutos típico

**Monitoramento:**
- Alertas de Redis down
- Memory usage > 80%
- Lag na fila de eventos

**Risco se ignorar:**
- Perda de eventos → cockpit desatualizado
- Session reset → operador deslogado no meio do dia
- Rate limit bypass → abuso de API

---

## Carriers de tabela (Movvi, Mengue, Braspress)

**Responsabilidade:** Fallback quando Melhor Envio indisponível ou quando cliente quiser usar tabelas próprias

**Como funciona:**
- Tabelas estáticas carregadas em memória ou banco
- Lookup: CEP de destino → zona geográfica → preço + prazo
- Usados em paralelo com Melhor Envio

**O que acontece se falha:**
- ❌ Opções específicas de carrier indisponíveis
- ✅ Operador cota com outros carriers
- ✅ Nenhuma perda de funcionalidade geral

**Recuperação:**
- Dados em banco → recarrega em memória
- Nenhuma ação manual (automático)

**Monitoramento:**
- Verificar se tabelas estão atualizadas (comparar com site do carrier)
- Alertas se tabela muito antiga (> 30 dias sem update)

---

## Twilio Webhook signature validation

**Responsabilidade:** Validar que webhooks vêm realmente do Twilio

**Como funciona:**
- Todo webhook Twilio vem com header `X-Twilio-Signature`
- MVP valida usando `TWILIO_AUTH_TOKEN` (env var)
- Se inválido, descarta e loga

**O que acontece se falhar:**
- ❌ Webhook descartado silenciosamente
- ❌ Mensagem não é processada
- ✅ Nenhuma perda de dados (Twilio tentará reenviar)

**Risco:**
- Se secret key vazou ou configurado errado: todos os webhooks rejeitados
- Não há fallback: message fica perdida até que o retry expire

**Monitoramento:**
- Contar rejeições de webhook por hora
- Se > 5% das tentativas rejeitadas = problema
- Logs de "invalid signature"

---

## Observabilidade / Sentry

**Responsabilidade:** Rastreamento de erros e eventos de sistema

**Como funciona:**
- Erros não-tratados são enviados para Sentry
- Eventos críticos (migration failures, auth issues) também enviados
- Dashboards para monitoramento em tempo real

**O que acontece se falhar:**
- ✅ Sistema continua funcionando (Sentry é observabilidade, não operação)
- ❌ Fica difícil debugar problemas em produção
- ❌ Erros silenciosamente passam despercebidos

**Risco:**
- Sem alertas, bugs podem acumular despercebidos
- Resposta a incidentes fica mais lenta

---

## Email / SMTP (para reset de senha, etc.)

**Responsabilidade:** Envio de e-mails (reset password, etc.)

**Como funciona:**
- Via provider SMTP (Sendgrid, AWS SES, etc.)
- Assincrono via queue

**O que acontece se falhar:**
- ✅ Operador não consegue fazer reset de senha
- ❌ Sem e-mail, fica bloqueado
- ⚠️ Impacto: não é imediato (só afeta reset)

**Recuperação:**
- Admin pode resetar senha via CLI (fallback)
- Quando email voltar, queue reprocessa

**Monitoramento:**
- Alertas se provider retorna erros
- Taxa de falha de envio > 5%

---

## CORS / Security headers

**Responsabilidade:** Proteção contra cross-site attacks

**Como funciona:**
- Middleware valida `Origin` header
- Bloqueia requests de domínios não-whitelisted

**O que acontece se falhar:**
- ❌ Qualquer origem pode fazer requests
- ❌ XSS attacks possíveis
- ⚠️ Dados podem ser expostos

**Risco:**
- Se CORS for configurado com `*` (allow-all): vulnerabilidade crítica
- Se whitelisted domínios forem hacked: eles também têm acesso

---

## Checklist: Como garantir que dependências estão saudáveis

Diário:
- [ ] Twilio webhooks chegando (< 1% erro de signature)
- [ ] Banco de dados accessible (queries < 1s p99)
- [ ] Redis online (memory < 80%)
- [ ] Melhor Envio API respondendo (fallback para tabelas funcionando)

Semanal:
- [ ] Carrier tables atualizado (< 30 dias)
- [ ] Sentry alertas dentro do esperado (sem spike de erros)
- [ ] Backup rodando
- [ ] Rate limit funcionando (no mínimo, alertas deveriam vir)

Mensal:
- [ ] Replicação do banco testada (failover simulation)
- [ ] Recovery time documentado e validado
- [ ] Dependências externas monitoradas (status page checar)

---

## O que fazer quando uma dependência cai

### Twilio down
- **Operador vê:** Inbox não atualiza
- **Ação:** Esperar Twilio recuperar + refresh browser
- **Tempo de resposta típico:** 5-15 minutos

### Banco down
- **Operador vê:** Sistema completo indisponível
- **Ação:** SRE toma action (failover automático ou manual)
- **Tempo de resposta típico:** 5-10 minutos

### Melhor Envio down
- **Operador vê:** Cotação lenta, mas consegue usar tabelas
- **Ação:** Nenhuma (fallback automático)
- **Tempo de resposta típico:** N/A (transparent)

### Redis down
- **Operador vê:** Pode deslogar (session loss), event queue pode ficar para trás
- **Ação:** SRE religa Redis
- **Tempo de resposta típico:** 2-5 minutos
