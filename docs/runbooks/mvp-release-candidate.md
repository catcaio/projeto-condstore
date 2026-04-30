# MVP Release Candidate Gate

Este documento descreve o processo de validação final para o lançamento do MVP do CONDSTORE OS.

## 1. O que é o Release Candidate Gate?

É um agregador de todas as validações de prontidão do sistema. Ele garante que todos os módulos críticos estão operacionais antes de um deploy em produção ou onboarding de um novo tenant.

## 2. Como Executar

Para rodar a suíte completa de validação:

```bash
npm run mvp:release-candidate
```

## 3. Módulos Validados

O gate executa sequencialmente:
1.  **Tenant Readiness**: Provisionamento e admin.
2.  **Freight Readiness**: Carriers, regras de frete e tabelas.
3.  **WhatsApp Readiness**: Webhooks e Twilio.
4.  **Billing Readiness**: Stripe e planos.
5.  **Tracking Readiness**: Google Ads e tags.
6.  **Cockpit Smoke**: UI e métricas básicas.
7.  **Pilot Readiness**: Checklist de lançamento do piloto.
8.  **Auth Readiness**: Banco, Sessão e OAuth.
9.  **Email Readiness**: SMTP Hostinger e transacional.
10. **Environment Health**: Acessibilidade da URL de produção e API de login.

## 4. Critérios de Aceite

O sistema é considerado `MVP_RELEASE_CANDIDATE_OK` somente se:
- Todos os scripts de `readiness` passarem (exit code 0).
- A API de login responder JSON estruturado (mesmo que erro 401/500 JSON).
- Não houver crash de runtime (HTML 500) em rotas críticas.
- Zero secrets expostos no código.
- Zero schema drift no banco de dados.

## 5. MANUAL_RAFA

Itens que requerem intervenção manual do operador:
- Configuração de senhas SMTP no painel Hostinger.
- Configuração de secrets OAuth no Google Cloud Console.
- Configuração de secrets Stripe.
- Configuração de chaves Twilio.

Estes itens devem ser configurados diretamente nas variáveis de ambiente da Vercel.
