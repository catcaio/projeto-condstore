---
trigger: always_on
---

- Nunca confiar em tenantId ou userId vindos de query/body quando a sessão for a origem correta.
- Sempre validar auth, permissões e isolamento por tenant.
- Nunca expor secrets, tokens ou dados sensíveis em logs.
- Sempre verificar guardrails em rotas críticas.