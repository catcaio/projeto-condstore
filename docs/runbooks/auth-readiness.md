<<<<<<< HEAD
# Auth Readiness Runbook

Este runbook descreve como validar a prontidão do sistema de autenticação do CONDSTORE OS.

## 1. Variáveis de Ambiente Críticas

Para o funcionamento do Auth em produção, as seguintes variáveis devem estar configuradas na Vercel:

- `AUTH_SECRET`: Chave de criptografia de sessão (mínimo 32 bytes).
- `PII_ENCRYPTION_KEY`: Chave para criptografia de dados sensíveis no banco.
- `DATABASE_URL`: URL de conexão com o banco TiDB.
- `GOOGLE_CLIENT_ID`: ID do cliente OAuth Google.
- `GOOGLE_CLIENT_SECRET`: Secret do cliente OAuth Google.

## 2. Validação Automatizada

Execute o comando abaixo para validar a configuração local/preview/produção:

```bash
npm run auth:readiness
```

O script valida:
- Conexão com o banco de dados.
- Existência do tenant base (`demo-mvp-tenant`).
- Existência do usuário administrador (`demo@condstore.io`).
- Carregamento das dependências de criptografia.

## 3. Troubleshooting Erro 500

Se a rota `/api/auth/login` ou `/api/auth/signup` retornar um erro 500 HTML (não-JSON):
- Verifique se `DATABASE_URL` está configurada para o ambiente específico na Vercel.
- Verifique os logs da Vercel para erros de `ERR_REQUIRE_ESM` ou `MISSING_DATABASE_URL`.
- Garante que a correção de importação estática em `src/infra/env/require-env.ts` está aplicada.

## 4. Google Login (OAuth)

Se o login via Google falhar:
- Verifique se a URL de callback está configurada no Google Cloud Console: `https://app.condstoreos.com/api/auth/google/callback`.
- Se as chaves estiverem ausentes, o sistema retornará um erro controlado ou marcará como MANUAL_RAFA no log de prontidão.
=======
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
>>>>>>> origin/main
