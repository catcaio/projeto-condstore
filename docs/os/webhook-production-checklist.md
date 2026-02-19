# Webhook Hardened + Freight Stateful: Checklist de Produção

## 1. Variáveis de Ambiente Obrigatórias
Antes do deploy, confirme que as seguintes variáveis estão configuradas no ambiente de produção (Vercel):

- `TWILIO_AUTH_TOKEN`: Token de autenticação da Twilio (essencial para validação de assinatura).
- `TWILIO_SIGNATURE_VALIDATION_ENABLED`: Deve estar setado como `true` para garantir segurança.
- `MELHOR_ENVIO_TOKEN`: Token para cálculo de frete real.
- `DATABASE_URL`: String de conexão com banco TiDB (com SSL).
- `REDIS_URL` / `KV_URL`: (Opcional) URL do Redis para sessão. Se não houver, o sistema usa fallback em memória (não recomendado para escala, mas funcional).

## 2. Smoke Test Manual
Após deploy, valide o funcionamento:

1.  Envie "Frete" para o número do bot.
    -   *Esperado:* "Olá! Vou ajudar você a calcular o frete. Qual é o CEP de destino?"
2.  Envie um CEP válido (ex: `01001-000`).
    -   *Esperado:* "CEP recebido! Agora, quantas unidades você deseja?"
3.  Envie uma quantidade (ex: `1`).
    -   *Esperado:* "Frete R$..., prazo ... dias. Quer fechar?"

## 3. Validação de Segurança e Logs
Acesse os logs da Vercel e confirme:

-   **Eventos de Sucesso:** Procure por `event: "WEBHOOK_OK"`.
-   **Ausência de PII:** Garanta que **nenhum** log contém o número de telefone completo, corpo da mensagem ou nome do usuário.
-   **Métricas:** Confirme se o evento `FREIGHT_QUOTED` está sendo registrado com `value`, `carrier` e `durationMs`.

## 4. Endpoints e Configuração
-   **Webhook URL:** `https://<dominio>/api/webhook`
-   **Método:** `POST`
-   **Content-Type:** O webhook rejeita automaticamente qualquer coisa que não seja `application/x-www-form-urlencoded`.

## 5. Scripts de Apoio
Para validação local ou em ambiente de stage, utilize o script de smoke test:
```bash
npx ts-node scripts/smoke-webhook.ts
```
*Nota: Requer o servidor rodando em `localhost:3000` (ou defina `BASE_URL`).*
