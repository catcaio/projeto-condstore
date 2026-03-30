# Runbook — Seed reproduzível do tenant de demo/piloto

Este runbook define um **setup único, idempotente e sem ajustes manuais invisíveis** para demo e piloto do MVP core.

## Objetivo

Criar/atualizar o tenant `demo-mvp-tenant` com:

- usuário admin e operador
- cliente B2B com contato principal
- conversa WhatsApp ativa
- histórico realista de quotes, pedidos e shipments
- timeline pronta para narrativa comercial

## Pré-requisitos

- `DATABASE_URL` apontando para o banco alvo
- dependências instaladas (`npm install`)

## Comando único (setup simples)

```bash
npm run seed:demo-tenant
```

## Variáveis opcionais

- `DEMO_TENANT_ID` (default: `demo-mvp-tenant`)
- `DEMO_ADMIN_PASSWORD` (default: `Condstore@123`)

Exemplo:

```bash
DEMO_TENANT_ID=demo-pilot-abc DEMO_ADMIN_PASSWORD='Senha!Segura' npm run seed:demo-tenant
```

## Garantias de reprodutibilidade

- **Idempotente**: usa `INSERT ... ON DUPLICATE KEY UPDATE`
- **Seed controlada**: IDs fixos por entidade + datas base fixas
- **Isolamento multi-tenant**: todas as inserções incluem `tenant_id`
- **Sem passos manuais ocultos**: o script sobe o dataset completo em uma execução

## Dados carregados (resumo)

- 1 tenant de demo ativo (`plan=PRO`)
- 2 usuários (`admin` e `operator`)
- 1 organização + 1 customer + 1 contato principal
- 1 conversa WhatsApp com mensagens inbound/outbound
- 2 simulações (quote enviada + quote convertida)
- 4 pedidos (3 entregues, 1 em trânsito)
- 4 shipments + eventos de timeline

## Validação mínima após seed

```sql
SELECT COUNT(*) FROM customers WHERE tenant_id = 'demo-mvp-tenant';
SELECT COUNT(*) FROM orders WHERE tenant_id = 'demo-mvp-tenant';
SELECT COUNT(*) FROM shipments WHERE tenant_id = 'demo-mvp-tenant';
```

Resultado esperado: `1`, `4`, `4`.

## Observabilidade

O script emite logs estruturados JSON com eventos:

- `seed.start`
- `seed.commit.ok`
- `seed.validation.summary`
- `seed.completed`
- `seed.failed`

## Uso em demo e piloto

- Rodar antes de cada demo para garantir baseline previsível
- Rodar no início de piloto para tenant dedicado do cliente (`DEMO_TENANT_ID=<tenant-do-piloto>`)
- Não reutilizar tenant de produção real para demonstração
