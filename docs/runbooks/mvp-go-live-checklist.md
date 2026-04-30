# Master Checklist: MVP Go-Live (CONDSTORE OS)

## Objetivo
Documentar o status final de prontidão de lançamento do MVP para o primeiro tenant real (Piloto) e mapear os esforços manuais remanescentes.

## Checklist Automático
A infraestrutura base pode ser testada com sucesso via comando único:
```bash
npm run pilot:readiness
```

Este comando assegura o estado operacional (mas offline das APIs externas) de:
- [x] Tenant
- [x] Frete (Carriers / Rules)
- [x] WhatsApp (Handlers / Inbound)
- [x] Billing (Guards)
- [x] Tracking (Database schema)
- [x] Cockpit (Metrics basic retrieval)

## Checklist MANUAL_RAFA (Dependências de Credenciais Reais)

O lançamento final requer as seguintes ações na Vercel/Dashboards externos:

### 1. Twilio (WhatsApp)
- [ ] Obter e configurar `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN`.
- [ ] Configurar o Webhook do Número no painel do Twilio para `https://app.condstoreos.com/api/whatsapp/incoming`.
- [ ] Provisionar o Sender Number no ambiente.

### 2. Melhor Envio (Frete)
- [ ] Gerar Token de Produção no painel do Melhor Envio.
- [ ] Configurar `MELHOR_ENVIO_TOKEN` e `MELHOR_ENVIO_API_URL`.

### 3. Stripe (Billing)
- [ ] Configurar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET`.
- [ ] Configurar Webhook no Stripe direcionando para `/api/webhook/stripe`.
- [ ] Criar primeiro plano na base e vincular o tenant ao CustomerID do Stripe.

### 4. Google Ads / Analytics (Tracking)
- [ ] Configurar `NEXT_PUBLIC_GA_MEASUREMENT_ID` e `NEXT_PUBLIC_GTM_ID`.
- [ ] Configurar `GOOGLE_ADS_CONVERSION_ID`.

### 5. Segurança & Acesso
- [ ] Definir um `AUTH_SECRET` forte (ex: `npx auth secret`).
- [ ] Entregar as credenciais de login para o operador piloto.

## Critérios de Sucesso do Piloto
1. O tenant consegue acessar o Cockpit.
2. O tenant consegue realizar uma cotação de frete end-to-end sem timeout da API.
3. O operador consegue despachar e receber mensagens de WhatsApp via pipeline sem duplicação (dedup funcional).
4. As conversões (Quotes/Orders) refletem nos relatórios básicos de dashboard.

## Procedimento de Rollback
Em caso de falha severa na operação de infraestrutura pós-merge:
1. Reverter PR na branch `main`.
2. Rodar sync de dependências (`npm ci`).
3. Re-executar validations (`npm run pilot:readiness`).
