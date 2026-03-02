# Relatório Final de Fundação e Estabilização P0

## 1. Causa Raiz do Login (Erro de Conexão)
O `POST /api/auth/login` estava retornando um HTML `405 Method Not Allowed`, derivado de um erro `500 Internal Server Error` gerado em tempo de compilação/importação pelas dependências da rota. A causa primária era a validação agressiva em `src/env.ts` que utilizava um `throw new Error(...)` no escopo principal do módulo (`top-level`) quando em produção, caso a Vercel ou ambiente intermediário atrasasse o carregamento de variáveis como `SEED_TOKEN`. Consequentemente, o Frontend `login-form.tsx` tentava injetar um `.json()` cego nessa payload de Erro Next.js (HTML) disparando a exception mascarada "Erro de conexão".
**Evidência Coletada:** `status 405`, `content-type: text/html; charset=utf-8` para POST, e `status 500 text/html` para GET.

## 2. P0 Login: Arquivos Alterados
* `src/env.ts`: Removido o `throw new Error` agressivo do top-level do parser de validação Zod. Encadeado um log crítico sem interromper o bootstrap das sub-rotas intermediárias.
* `src/app/login/login-form.tsx`: Substituída a extração não segura `.json()` por validação via `.text()`, encapsulando as extrações de erros provindos de HTML e resgatando o `x-request-id` ou HTTP Status para o cliente poder diagnosticar o erro sem falso positivo para problemas de "Conexão de rede".
* `src/tests/auth/login-route.test.ts`: Nova suite Vitest comprovando isolamento da rota API sem jamais retornar HTML sob 4xx e 5xx codes.

## 3. Estado dos Gates e Validação (Local CI)
* **Typecheck (`npm run typecheck`)**: Aprovado. (Exit Code 0).
* **Zero-Trust Leaks (`npm run lint:env` / `npm run lint:pii`)**: Aprovados.
* **Vitest CI (`npm run test:ci`)**: 467 testes rodados e esverdeados limpos em multithread no Windows.
* **Database (`drizzle-kit check`)**: Sincronizado, divergências ausentes.
* **Build de Produção (`npm run build`)**: Compilação otimizada completa com sucesso (Next.js 16.1.6).

## 4. Como Validar a Correção na Prática
1. Garanta que todas as ENVS obrigatórias da Vercel estão ativas antes do PR.
2. Efetue merge do Pull Request para sua `main`.
3. Tente forçar um erro ou insira credenciais inválidas em produção e note que UI informará "Credenciais inválidas" precisamente provindas do body JSON ou os RequestIDs da CDN em caso de Server Fail.
4. Tese do painel Cockpit restabelecida em 100%.

## 5. Riscos Remanescentes Acordados
* **Redis Transient Failures:** Apesar de envelopados, picos de latência no RateLimiter podem disparar `degraded mode` onde o fallback de memória Node.js sustente os contadores caso haja desconexão da rede da DigitalOcean/Vercel.
* **Database TLS Drops:** Manutenções na infra do Planetscale/MySQL podem suspender os sockets abertos do MySQL2 Connection Pool em modo Singleton Serverless, demandando eventuais cold starts.
