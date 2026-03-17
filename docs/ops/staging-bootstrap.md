# Condstore OS: Staging Bootstrap

Este documento descreve cirurgicamente como levantar o ambiente de Staging (ou recriá-lo do zero) sem depender de scripts locais ou *ngrok*.

## 1. Hosting Nativo (Vercel)
O projeto Condstore OS tira total proveito do Next.js App Router. O ambiente principal de Staging é hospedado via [Vercel](https://vercel.com).
O domínio público fixo atual é: **`https://app.condstoreos.com`**.

## 2. Injeção de Variáveis (Environment)
Para o staging funcionar, a plataforma Serverless DEVE possuir as seguintes variáveis ativas e injetadas no Dashboard:

```env
# Banco de Dados (TiDB Serverless/MySQL)
DATABASE_URL="mysql://<user>:<password>@<host>:4000/lojacond?ssl={\"rejectUnauthorized\":true}"

# Fila e Cache (Obrigatório para o FinOps Worker não falhar)
# IMPORTANTE: A ausência no Front-End causa Memory Fallback, mas trava os workers puros.
REDIS_URL="redis://..."

# Auth
AUTH_SECRET="<random_hash>"

# Twilio (Core Integrations)
TWILIO_ACCOUNT_SID="<sid>"
TWILIO_AUTH_TOKEN="<token>"
TWILIO_WHATSAPP_NUMBER="whatsapp:+<number>"
```

## 3. Banco de Dados (Schema Sync)
A Vercel fará boot do servidor Web, porém **o repositório de banco precisa estar fisgado**.
A sincronia de schema (DDL) não roda automaticamente no Serverless Build para evitar gargalos. Rodar *uma vez* partindo do Host Seguro (ex: sua máquina local conectada ao TiDB Cloud):

```bash
# Sincrona Drizzle ORM ao branch Master (Staging/Prod)
npm run db:push
```

## 4. Webhook Twilio
Os endpoints que recebem eventos assíncronos não dependem de túneis após o Staging real:
1. Faça login na Twilio Console.
2. Navegue para Messaging > Try It Out > Send a WhatsApp Message > Sandbox settings
3. **WHEN A MESSAGE COMES IN:** `https://app.condstoreos.com/api/whatsapp/incoming` (HTTP POST)
4. **STATUS CALLBACK URL:** `https://app.condstoreos.com/api/whatsapp/status` (HTTP POST)

## 5. Script de Emergência (Ecosystem Recovery)
Caso o comando principal de Drizzle pule acidentalmente a tabela `ecosystem_events`, um bypass procedural seguro está armazenado em:
`scripts/recovery/create-ecosystem-events.mjs`

Para executá-lo:
`node --env-file=.env scripts/recovery/create-ecosystem-events.mjs`
