# Tasks

- [x] Locate webhook handler file
- [x] Verify tenant resolution failure behavior (403/404)
- [x] Verify absence of fallback tenant
- [x] Verify request body reading (text vs json)
- [x] Verify signature verification URL logic
- [x] **Implement Webhook Security Hardening**
    - [x] Add `TENANT_NOT_FOUND` to `src/infra/errors.ts`
    - [x] Update `TenantRepository` to throw `TENANT_NOT_FOUND`
    - [x] Update `POST` in `route.ts` to return 403 for `TENANT_NOT_FOUND` and invalid signatures
    - [x] Verify changes (Type check passed; script provided)
- [x] **Relatório Final**
    - [x] Gerar RELATORIO_FINAL.md
- [x] **Deployment**
    - [x] Create branch `feat/webhook-hardening-boundary`
    - [x] Commit changes
    - [x] Push to origin
- [x] **Documentação de Código**
    - [x] Gerar RELATORIO_CODIGO_HARDENING.md
