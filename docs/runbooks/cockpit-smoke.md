# Runbook: Cockpit Smoke Test

## Objetivo
Garantir que as rotas principais do painel operacional do tenant (Cockpit) e as consultas de métricas estejam responsivas e seguras.

## Variáveis (Nomes)
- `AUTH_SECRET` (Crítico para login)
- `NEXT_PUBLIC_APP_URL`

## Validação Automatizada
```bash
npm run cockpit:smoke
```

## Checklist Operacional
- [ ] Conexões de métricas básicas funcionam sem crashar.
- [ ] O banco retorna dados (ou array vazio) para pedidos e cotações.
- [ ] Sessão de usuário pode ser estabilizada se `AUTH_SECRET` estiver configurado.

## MANUAL_RAFA (Próximos Passos Reais)
1. Certificar que `AUTH_SECRET` em produção possui entropia suficiente (`npx auth secret`).
2. Logar no dashboard usando as credenciais do admin provisionado pelo script de seed.
