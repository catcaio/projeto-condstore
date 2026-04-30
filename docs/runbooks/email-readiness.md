# Email Readiness

Este runbook descreve a configuração e validação do serviço de e-mail transacional do CONDSTORE OS utilizando o domínio `@condstoreos.com` via Hostinger.

## 1. Configuração de Ambiente (Envs)

Para o funcionamento correto do e-mail em produção (Vercel), as seguintes variáveis devem ser configuradas:

- `SMTP_HOST`: Host do servidor SMTP (ex: `smtp.hostinger.com`).
- `SMTP_PORT`: Porta SMTP (recomendado `465` para SSL/TLS ou `587`).
- `SMTP_SECURE`: `true` se usar porta 465.
- `SMTP_USER`: Endereço de e-mail completo (ex: `admin@condstoreos.com`).
- `SMTP_PASS`: Senha do e-mail (MANUAL_RAFA).
- `MAIL_FROM`: Remetente padrão (ex: `CONDSTORE OS <admin@condstoreos.com>`).
- `MAIL_REPLY_TO`: E-mail para resposta (ex: `admin@condstoreos.com`).

## 2. Validação Técnica

O script `npm run email:readiness` realiza as seguintes checagens:

1. **Presença de Envs**: Verifica se todas as variáveis necessárias estão definidas.
2. **Validação de Domínio**: Garante que o remetente utiliza o domínio `@condstoreos.com`.
3. **Dry-run**: Valida o carregamento do serviço sem realizar envios reais.

### Teste de Envio Real

Para validar a entrega efetiva na caixa de entrada, execute:

```bash
SEND_TEST_EMAIL=true TEST_EMAIL_TO=seu-email@dominio.com npm run email:readiness
```

## 3. Configurações Hostinger (DNS)

Certifique-se de que o domínio `condstoreos.com` possui os registros DNS corretos para evitar spam:

- **SPF**: `v=spf1 include:_spf.mail.hostinger.com ~all`
- **DKIM**: Configurado no painel da Hostinger.
- **DMARC**: Recomendado `v=DMARC1; p=none;` para monitoramento inicial.

## 4. Checklist MANUAL_RAFA

- [ ] Criar conta `admin@condstoreos.com` no painel Hostinger.
- [ ] Configurar Envs na Vercel.
- [ ] Validar SPF/DKIM no painel Hostinger.
- [ ] Executar teste de envio real.
