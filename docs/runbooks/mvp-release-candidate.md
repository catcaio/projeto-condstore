# MVP Release Candidate Gate

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
