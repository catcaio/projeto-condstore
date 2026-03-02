# Go/No-Go Checklist (Security & Keys + Routing)

Este checklist automatizável garante que as validações de integração e políticas de segurança fundamentais do cockpit e do motor de infraestrutura do sistema LOJACOND estão verificadas e prontas para uso em ambiente de produção (Staging/Production).

### 1) Validação de Segredos e Rotações (Security & Keys)
- [ ] O componente de Security & Keys renderiza em `/cockpit/settings/security`.
- [ ] As máscaras (visualização restrita de tokens) estão operantes. 
- [ ] Os segredos rotacionados persistem no Banco (`DB (encrypted)`) com sucesso via encriptação em trânsito e at-rest, descartando a vulnerabilidade em plain text.
- [ ] Testes de conexão aos provedores (Twilio, Stripe) completados sem erros.
- [ ] Auditoria validada (Evento `SECRET_ROTATED` gerado e salvo sem imprimir o segredo atualizado em log).

### 2) Proteção de Interfaces Interiores (Internal Locked)
- [ ] O Guardião Middleware de bloqueio ativou perfeitamente nos patterns `/api/internal/*`.
- [ ] Rotas sem chave restrita retornam erro `401 Unauthorized` obrigatório.
- [ ] Exceção de Health API e rotas públicas confirmadas pass-through.
- [ ] REGRA ARQUITETURAL: Todas as rotas baseadas em `/api/internal/*` exigem o uso do módulo `requireInternalToken()`, seja retornando o buffer seguro via Rate Limit ou trancando a requisição caso não o encontre.
- [ ] REGRA ARQUITETURAL: Todas as operações Administrativas Cockpit (`/api/cockpit/*`) e suas derivações (`domine/summary`, `connectors`) exigem isoladamente o middleware explícito `requireAdmin()` interceptando qualquer fluxo que exponha dados de multi-tenant agregados.

### 3) Disjuntor Operacional de Tenant (Kill Switch)
- [ ] Chave de Kill Switch habilitada por tenant (`outboundEnabled`).
- [ ] Twilio Webhooks aceitam payloads inbound normalmente quando desativado.
- [ ] Tentativas de envio outbound pelo provedor via webhook são canceladas (`return false`) antes de baterem na nuvem caso o switch esteja travado, salvando rastro `twilio_outbound_blocked_by_kill_switch` no auditor.

### 4) Conclusão de Integração e Smoke (Teste Fumaça)
- [ ] `smoke-prod.ps1` executado resultando em 100% PASS (`Exit Code 0`).
- [ ] Sem quebras de dependências circulares capturadas durante o TS Check.

## Condição Final para Aprovação do Merge
Se todos os passos da FASE A à FASE D (rate limiter métrica, endpoints diags, security UI e knowledge sources endpoint tests) passaram, você está liberado para mesclar na base principal.
