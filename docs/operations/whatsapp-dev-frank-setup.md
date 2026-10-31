# Setup Local: Atendimento Contextual do Frank no WhatsApp (Dev Opt-in)

Este documento descreve como habilitar e homologar o atendimento automático e contextual do Frank por WhatsApp exclusivamente no ambiente de desenvolvimento local (`NODE_ENV=development`) para o tenant `tenant-lojacond-dev`.

---

## 1. Princípios de Segurança e Guardrails
- **Isolamento de Tenant**: Apenas requisições com `tenantId === 'tenant-lojacond-dev'` podem disparar respostas automáticas contextuais.
- **Ambiente Restrito**: A flag só tem efeito se `NODE_ENV === 'development'`. Em produção ou teste, respostas autônomas continuam congeladas (`SUPERVISED_ONLY`).
- **Consentimento LGPD**: Mensagens de usuários sem consentimento registrado continuam bloqueadas, aguardando 'Sim' ou 'Aceito' antes de qualquer interação contextual.
- **Handoff Humano**: Se a conversa estiver com status `operator_active`, tiver atendente atribuído ou o operador tiver interagido recentemente, o Frank é suspenso e o atendimento humano permanece no controle.

---

## 2. Variáveis de Ambiente Necessárias (Local)

No arquivo `.env.local` (nunca versionado no Git), configure as variáveis:

```env
# Ativar opt-in do Frank em dev para tenant-lojacond-dev
FRANK_DEV_AUTONOMOUS_ENABLED=true

# Twilio Credentials (Sandbox ou Dev)
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWILIO_PHONE_NUMBER=whatsapp:+14155238886

# OpenAI API Key (necessária para geração contextual do Frank/LLM)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
```

*Nota: Não compartilhe nem exponha suas chaves reais em commits ou canais públicos.*

---

## 3. Fluxo de Execução e Homologação Local

1. **Subir aplicação Next.js local**:
   ```bash
   npm run dev -- -p 3001
   ```

2. **Expor porta via ngrok**:
   ```bash
   ngrok http 3001
   ```

3. **Configurar Webhook no Twilio Console**:
   - URL: `https://<seu-subdominio>.ngrok-free.app/api/whatsapp/incoming`
   - Método: `HTTP POST`

4. **Testar no WhatsApp Sandbox**:
   - Enviar mensagem inicial: caso seja um novo número, responder 'Sim' para aceitar os termos LGPD.
   - Enviar mensagem de produto ou cotação: o Frank formula a resposta contextual e envia via Twilio.
   - Acompanhar no **Cockpit Gerencial**: mensagens inbound e outbound ficam registradas com ator `AI` e `source: SYSTEM`.
   - Assumir conversa pelo Cockpit: verificar que ao mudar status ou enviar mensagem manual, o Frank respeita o handoff e não gera respostas automáticas conflitantes.

---

## 4. Atualização do Clone Local após Merge

Após o merge desta branch:
```bash
git checkout main
git pull origin main
npm ci
```
Adicione `FRANK_DEV_AUTONOMOUS_ENABLED=true` no seu `.env.local` para continuar testando localmente.
