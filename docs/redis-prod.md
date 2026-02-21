# Migração de Redis para Produção (Vercel + Upstash)

Em produção, a Vercel restringe severamente processos persistentes em background (in-memory caching não compartilha estado entre requisições "Serverless").
Como nossa aplicação depende ativamente de sessões no WhatsApp, **é obrigatório** rodar o Redis externo, por isso nosso in-memory serve apenas de degraded fallback local.

A Vercel integra nativamente com o **Upstash Redis**, o que torna a conexão zero-latency dentro da AWS us-east-1.

## 1. Como criar a Instância via Vercel

1. No dashboard da Vercel do seu projeto (`projeto-condstore`), vá em **Storage**.
2. Clique em **Create Database** e selecione **Upstash Redis**.
3. Defina um nome (ex: `condstore-redis-prod`).
4. Selecione a mesma região onde o projeto está rodando (idealmente `us-east-1` ou `sa-east-1`).
5. Avance a configuração Padrão/Free tier.

## 2. Como capturar e setar a `REDIS_URL`

Ao criar o banco, a Vercel importará automaticamente as **Environment Variables** no seu ambiente `Production`.
Você deve confirmar que possui a seguinte env var setada em **Settings > Environment Variables**:

- Chave: `REDIS_URL`
- Valor de Exemplo: `rediss://default:xxxxx@us1-upstash-redis...upstash.io:32442` (note o `rediss://` indicativo de TLS).

## 3. Validação de Saúde

Nosso webhook (em `src/app/api/health/route.ts`) irá automaticamente verificar a presença e resposta dessa URL:
1. Se for produção e `REDIS_URL` faltar: a rota acusará Erro 500 (`missing`).
2. Com a URL presente: acusará `ok` se o Ping for bem-sucedido num limite inferior a 2000ms.
