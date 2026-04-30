# Runbook: WhatsApp & Twilio Readiness

## Objetivo
Garantir que o pipeline de inbound e outbound de mensagens via Twilio esteja configurado e protegido para o tenant.

## Variáveis (Nomes)
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `PII_ENCRYPTION_KEY`
- `VERCEL_URL` ou `NEXT_PUBLIC_APP_URL`

## Validação Automatizada
```bash
npm run whatsapp:readiness
```

## Checklist Operacional
- [ ] `PII_ENCRYPTION_KEY` definida.
- [ ] Tabela de dedup (`inbound_message_dedup`) acessível.
- [ ] Handler `/api/whatsapp/incoming` no ar e validando assinaturas do Twilio.

## MANUAL_RAFA (Próximos Passos Reais)
1. Inserir chaves reais do Twilio no painel da Vercel.
2. Configurar o Webhook do Twilio para apontar para `https://app.condstoreos.com/api/whatsapp/incoming`.
3. Adicionar o número real do tenant nas configurações do sistema/Twilio.
