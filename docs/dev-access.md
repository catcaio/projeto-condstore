# Dev Access & QA Bootstrap

Em ambientes de desenvolvimento (onde `NODE_ENV=development` ou `VERCEL_ENV=development`), o rate limit e a ausência de credenciais podem bloquear o fluxo de QA e a automação do agente no browser ao acessar rotas protegidas do Cockpit.

Para mitigar isso de forma segura, criamos o endpoint **Dev Session Bootstrap**:

## Rota
`GET /api/internal/dev/session`

## Como Usar

1. No seu arquivo `.env.local`, defina um token secreto:
   ```env
   INTERNAL_TOKEN=sua_senha_secreta_aqui
   ```

2. Faça uma requisição GET para o endpoint passando o header `x-internal-token`:
   ```bash
   curl -H "x-internal-token: sua_senha_secreta_aqui" http://localhost:3000/api/internal/dev/session
   ```

3. O servidor irá ignorar credenciais, buscará o primeiro usuário com perfil `admin` no banco de dados, e injetará o cookie `condstore_session` validado na sua resposta.

4. A partir desse momento, as navegações para rotas sob `/cockpit/*` no mesmo client/browser estarão autenticadas.

> **ATENÇÃO:** Essa rota **não** funciona em produção real. Se `NODE_ENV` for `production` e não houver flag de `VERCEL_ENV` de desenvolvimento explícita, a rota retornará 403.
