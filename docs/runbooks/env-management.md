# Runbook: Gerenciamento de Variáveis de Ambiente (ENV)

Este documento descreve como o CONDSTORE OS gerencia configurações sensíveis e segredos em diferentes ambientes.

## 1. Fonte de Verdade (Vercel)

As variáveis de ambiente oficiais são armazenadas na **Vercel**.
- **Production**: Segredos reais de produção (Stripe Live, Twilio Live, etc).
- **Preview**: Segredos de teste para PRs e staging.
- **Development**: Segredos para desenvolvimento local.

## 2. Padrão de Arquivos Locais

O projeto utiliza a seguinte estrutura de arquivos (todos ignorados pelo Git, exceto templates):

| Arquivo | Uso | Descrição |
| :--- | :--- | :--- |
| `.env.example` | **Template** | Único arquivo versionado. Contém apenas nomes e placeholders. |
| `.env.local` | **Desenvolvimento** | Carregado por `npm run dev` e testes. Contém chaves de dev. |
| `.env.production.local`| **Produção Local** | Usado para `npm run build` e `npm run start` localmente. |
| `.env.preview.local` | **Preview Local** | Usado para simular o ambiente de Preview localmente. |

## 3. Como Sincronizar

Para obter as variáveis mais recentes da Vercel:

```bash
# Para Desenvolvimento Local (.env.local)
vercel env pull .env.local

# Para Produção Local (.env.production.local)
vercel env pull .env.production.local --environment production
```

## 4. Regras de Segurança (Mandatórias)

1. **NUNCA** commite arquivos `.env`, `.env.local` ou similares que contenham segredos.
2. O `.gitignore` está configurado para bloquear `*.env.*` e `.env.local`.
3. Sempre adicione novas variáveis ao `.env.example` com valores fake.
4. Antes de cada PR, verifique vazamentos com `npm run lint:env`.

## 5. Redis Local

O sistema utiliza Redis para rate-limiting e idempotência.
- Se `REDIS_URL` estiver ausente, o sistema cai para um fallback **in-memory** (apenas para desenvolvimento).
- Para testes fiéis à produção, use uma instância do Upstash configurada em `REDIS_URL`.

## 6. Gates de Validação

Após qualquer alteração em variáveis de ambiente, execute:

```bash
npm run mvp:release-candidate
```
Este comando valida se as chaves críticas (`AUTH_SECRET`, `DATABASE_URL`, `PII_ENCRYPTION_KEY`) estão presentes e no formato correto.
