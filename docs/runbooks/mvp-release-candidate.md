# MVP Release Candidate Gate

<<<<<<< HEAD
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
=======
Este runbook consolida todas as checagens técnicas estritas para o Go-Live do **CondStore OS MVP**.

## 1. O que é o Release Candidate Gate?
É o portal de validação operacional agregada: garante que Frete, WhatsApp, Stripe, Rastreamento, Interface Cockpit e Autenticação fluem, respondem nos contratos esperados e não acionam erros fatais silenciosos no Edge da Vercel.

O script principal reside em `scripts/validate-mvp-release-candidate.ts`.

## 2. Ordem de Validação e Agregação
Para certificar a branch com selo `MVP_RELEASE_CANDIDATE_OK`, as execuções em cadeia realizam:
1. `npm run tenant:readiness`
2. `npm run freight:readiness`
3. `npm run whatsapp:readiness`
4. `npm run billing:readiness`
5. `npm run tracking:readiness`
6. `npm run cockpit:smoke`
7. `npm run pilot:readiness`
8. `npm run auth:readiness`
9. **Production Check**: Requisição real em `app.condstoreos.com` para testar integridade de roteamento/edge sem causar Crash HTML não-JSON.

## 3. Em caso de falha (`FAILED`)
Se a pipeline acusar falha na subida para PR ou na checagem local:
1. Revise se alguma credencial de desenvolvimento está ausente em `.env.local` (*MANUAL_RAFA* não impede scripts locais que simulam/mockam comportamento seguro).
2. Não tente contornar o 500 do servidor mudando a stack; trate os erros e garanta retornos serializáveis em JSON para consumo adequado na UI.

O sistema só pode ser entregue ao Operador de fato se todas as frentes validarem.
>>>>>>> origin/main
