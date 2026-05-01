# Auth Readiness Runbook

Este runbook descreve como validar a prontidão do sistema de autenticação do CONDSTORE OS.

## 1. Variáveis de Ambiente Críticas

Para o funcionamento do Auth em produção, as seguintes variáveis devem estar configuradas na Vercel:

- `AUTH_SECRET`: Chave de criptografia de sessão (mínimo 32 bytes).
- `PII_ENCRYPTION_KEY`: Chave para criptografia de dados sensíveis no banco.
- `DATABASE_URL`: URL de conexão com o banco TiDB.
- `GOOGLE_CLIENT_ID`: ID do cliente OAuth Google.
- `GOOGLE_CLIENT_SECRET`: Secret do cliente OAuth Google.

> [!IMPORTANT]
> As credenciais de produção **NÃO ESTÃO COMMITADAS**. Antes de homologar o primeiro tenant, garanta que estas chaves foram provisionadas manualmente no painel da Vercel.

## 2. Validação Automatizada

Execute o comando abaixo para validar a configuração local/preview/produção:

```bash
npm run auth:readiness
```

O script valida:
- Conexão com o banco de dados.
- Existência do tenant base (`demo-mvp-tenant`).
- Existência do usuário administrador (`demo@condstore.io`).
- Carregamento das dependências de criptografia (`AUTH_SECRET`, `PII_ENCRYPTION_KEY`).
- Se a integração com Google Login (OAuth) possui credenciais reais.
- Integridade inicial do módulo de geração e validação de hashes.

## 3. Troubleshooting Erro 500

Anteriormente, a ausência de chaves criptográficas em produção causava um crash no servidor da Vercel (Edge Runtime) devido ao uso de `require()` em ambiente ESM. Isto foi corrigido.

O comportamento esperado atual, caso as chaves não sejam fornecidas ou haja misconfiguração:
- A API de `/api/auth/login` deve responder com status `500` acompanhado de um objeto `JSON` estruturado com as propriedades `code` e `error`.
- Se ainda assim observar um erro HTML (não-JSON), verifique os logs da Vercel para erros de `ERR_REQUIRE_ESM` ou `MISSING_DATABASE_URL`.
- Garanta que a correção de importação estática em `src/infra/env/require-env.ts` está aplicada.

## 4. Google Login (OAuth)

Se o login via Google falhar:
- Verifique se a URL de callback está configurada no Google Cloud Console: `https://app.condstoreos.com/api/auth/google/callback`.
- Se as chaves estiverem ausentes, o sistema retornará um erro controlado ou marcará como `MANUAL_RAFA` no log de prontidão.
