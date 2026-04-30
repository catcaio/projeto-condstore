# Runbook: Onboarding Técnico do Primeiro Tenant Real

## Objetivo
Este documento descreve o processo de provisionamento, ativação e validação do primeiro tenant real no CONDSTORE OS.

## Pré-requisitos
- Acesso ao TiDB Cloud (Produção).
- Acesso à Vercel (Deploy).
- Vercel CLI instalada e linkada ao projeto.
- Variáveis de ambiente configuradas no `.env.local` (via `vercel env pull`).

## Variáveis de Ambiente Necessárias (Nomes)
- `DATABASE_URL`
- `AUTH_SECRET`
- `PII_ENCRYPTION_KEY`
- `REDIS_URL`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `MELHOR_ENVIO_TOKEN`
- `STRIPE_SECRET_KEY`

## Passo 1: Seed de Provisionamento
Para provisionar o tenant inicial com dados de demonstração ou estrutura básica:
```bash
npm run seed:demo-tenant
```

## Passo 2: Validação de Readiness
Após o seed, execute a validação automatizada para garantir que o tenant, o usuário admin e o plano estão corretos:
```bash
npm run tenant:readiness
```

## Checklist Operacional do Primeiro Tenant
- [ ] Tenant criado com slug correto.
- [ ] Usuário admin cadastrado com role `admin`.
- [ ] Plano definido como `active` ou `trialing`.
- [ ] Login testado no Dashboard (`https://app.condstoreos.com`).
- [ ] Acesso ao Cockpit verificado.
- [ ] Configurações de canal (WhatsApp) mapeadas.

## Próximos Passos (Manuais)
O responsável (Rafa) deve realizar as integrações externas reais via Dashboard ou Variáveis de Ambiente:
1. **Twilio**: Configurar Webhook da Sandbox ou Número Real para `https://app.condstoreos.com/api/whatsapp/incoming`.
2. **Melhor Envio**: Inserir Token de produção.
3. **Stripe**: Configurar Webhooks e IDs de produtos.
4. **Google Ads**: Configurar IDs de conversão no tracking service.

---
**Critérios de Aceite:**
- `npm run tenant:readiness` retorna OK.
- Cockpit exibe métricas (mesmo que zeradas).
- Admin consegue logar.
