# Auth Readiness

Este runbook descreve a checagem operacional do sistema de autenticação do CondStore OS.

## 1. O que é validado
O script `npm run auth:readiness` verifica:
- Conexão com o banco de dados.
- Existência do tenant e admin de onboarding padrão.
- Se os requisitos criptográficos (`AUTH_SECRET`, `PII_ENCRYPTION_KEY`) estão devidamente fornecidos.
- Se a integração com Google Login (OAuth) possui credenciais reais.
- Integridade inicial do módulo de geração e validação de hashes.

## 2. Erro "500 Não-JSON" (Resolvido)
Anteriormente, a ausência de `AUTH_SECRET` ou chaves criptográficas em produção causava um crash no servidor da Vercel (Edge Runtime) devido ao uso dinâmico de `require()`. Isto foi corrigido.
O comportamento esperado atual, caso as chaves não sejam fornecidas, é que a API de `/api/auth/login` responda com status `500` acompanhado de um objeto `JSON` estruturado com as propriedades `code` e `error`.

## 3. MANUAL_RAFA
As credenciais de produção de autenticação **NÃO ESTÃO COMMITADAS**.
Antes de homologar o primeiro tenant, garanta as seguintes chaves na Vercel:
- `AUTH_SECRET`
- `PII_ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
