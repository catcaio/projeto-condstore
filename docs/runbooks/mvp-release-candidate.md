# MVP Release Candidate Runbook

Este documento descreve o processo de validação final para o lançamento do MVP do CONDSTORE OS.

## 1. O que é o Release Candidate Gate?

É o portal de validação operacional agregada. Ele verifica que Frete, WhatsApp, Stripe, Rastreamento, Interface Cockpit, E-mail e Autenticação respondem nos contratos esperados e não acionam erros fatais silenciosos no runtime da Vercel.

O script principal reside em `scripts/validate-mvp-release-candidate.ts`.

## 2. Como Executar

Para rodar a suíte completa de validação técnica estrita:

```bash
npm run mvp:release-candidate
```

## 3. Módulos Validados

O gate executa sequencialmente:

1.  **Tenant Readiness**: Provisionamento e admin inicial.
2.  **Freight Readiness**: Carriers, regras de frete e tabelas.
3.  **WhatsApp Readiness**: Webhooks e integração Twilio.
4.  **Billing Readiness**: Stripe e planos.
5.  **Tracking Readiness**: Google Ads e tags.
6.  **Cockpit Smoke**: UI e métricas operacionais básicas.
7.  **Pilot Readiness**: Checklist de lançamento do piloto.
8.  **Auth Readiness**: Banco, Sessão e OAuth (Google).
9.  **Email Readiness**: SMTP Hostinger e fluxos transacionais.
10. **Production Health**: Requisição real em `app.condstoreos.com` para testar integridade de roteamento/edge sem causar Crash HTML não-JSON.

## 4. Critérios de Aceite

O sistema é considerado tecnicamente `MVP_RELEASE_CANDIDATE_OK` somente se:
- Todos os scripts de `readiness` passarem (exit code 0).
- A API de login responder JSON estruturado (mesmo que erro 401/500 JSON).
- Não houver crash de runtime (HTML 500) em rotas críticas.
- Zero secrets expostos no código.
- Zero schema drift no banco de dados.

## 5. Em caso de falha (`FAILED`)

Se a pipeline acusar falha na subida para PR ou na checagem local:
1.  Revise se alguma credencial de desenvolvimento está ausente em `.env.local` (*MANUAL_RAFA* não impede scripts locais que simulam/mockam comportamento seguro).
2.  Não tente contornar erros de servidor mudando a stack; trate os erros e garanta retornos serializáveis em JSON para consumo adequado na UI.
3.  Verifique se os itens manuais (SMTP, OAuth, Stripe, Twilio) foram configurados diretamente nas variáveis de ambiente da Vercel.

O sistema só pode iniciar piloto real supervisionado se todas as frentes validarem com sucesso e se o operador humano confirmar o plano de execução, kill switch e coleta de métricas. Este gate não declara piloto real concluído nem resultado comercial validado.
