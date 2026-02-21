# Checklist de Cutover para Produção (WhatsApp & Twilio)

Este guia define os passos exatos para migrar a automação de mensagens de Freight/Cockpit para Produção de forma segura.

## 1. Configurar Ambiente (Vercel)
Antes de virar a chave, certifique-se de preencher as seguintes variáveis obrigatórias no painel da Vercel para o ambiente `Production`:

- `TWILIO_ACCOUNT_SID`: (Live Account SID, começa com "AC")
- `TWILIO_AUTH_TOKEN`: (Live Auth Token)
- `TWILIO_WHATSAPP_NUMBER`: (Número oficial formatado: `whatsapp:+5511...`)
- `APP_BASE_URL`: (A URL de produção exata, ex: `https://frete.lojacond.com.br`)
- `TWILIO_SIGNATURE_VALIDATION_ENABLED`: `true` (A infraestrutura atual já ignora booleanos em prod e **força a assinatura**, mas é boa prática documentar).

> **Aviso:** Sem o `APP_BASE_URL` preenchido a API acusará Erro 500 no startup do webhook para sua proteção.

## 2. Upsert do Tenant da Empresa
Após o commit ir para a `main`, rode o script no banco de produção para garantir que o número oficial está cadastrado.  
Se o repositório estiver local e o `DATABASE_URL` plugado em prod:
```bash
npx tsx src/scripts/upsert-tenant.ts
```
*(Confirme o Success! no console).*

## 3. Apontamento Twilio (Cutover)
1. Acesse o **Console do Twilio > Messaging > Services > [Seu Service] > Sender Pool** e certifique-se que o número WhatsApp está lá.
2. Navegue até **Integration**.
3. Selecione a opção **"Send a webhook"**.
4. **Primary Webhook:**  
   - URL: `https://SUA_Vercel_APP_BASE_URL/api/webhook`
   - HTTP Method: `POST`
5. **Fallback Webhook:**
   - URL: `https://SUA_Vercel_APP_BASE_URL/api/webhook/fallback`
   - HTTP Method: `POST`

## 4. Smoke Tests (Validação Imediata)

### A. Validação de Saúde (Healthcheck)
Rode via terminal:
```bash
curl -i https://SUA_Vercel_APP_BASE_URL/api/health
```
**Esperado:** Resposta `200 OK` com payload contendo `"ok": true`, `"twilio": true` e `"db": "ok"`. NENHUM segredo Twilio deve estar exposto.

### B. Validação Prática (WhatsApp Push)
1. Envie uma mensagem pelo WhatsApp (ex: `"Cotação"`) para o número de produção da Lojacond.
2. Verifique se o reply automático vem instantaneamente (Bot pergunta o CEP).
3. Continue e mande um CEP (`01001-000`) para validar a conexão integral com o Melhor Envio/Frete Table em prod.

## 5. Procedimento de Rollback (Em caso de erro crasso)

Se a automação parar no nível 4B sem retornar falha (Ou apenas retornar a mensagem de sistema em manutenção do fallback):
1. **Volte o Primary Webhook no Twilio:** Altere de volta a URL para o seu ngrok de desenvolvimento, ou servidor antigo.
2. **Reverta a Vercel:** Entre nos seus Deployments da respositorio na Vercel e faça o re-deploy reativando a versão anterior usando o botão (Rollback) até diagnosticar os Log Events pelo Datadog/Vercel Logs.
