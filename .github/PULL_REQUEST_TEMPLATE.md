## Descrição

<!-- Descreva o que este PR faz em 1–3 linhas. Seja direto: o que mudou e por quê. -->

## Tipo de mudança

- [ ] Bugfix
- [ ] Nova funcionalidade
- [ ] Refatoração (sem mudança de comportamento)
- [ ] Documentação
- [ ] Scaffolding / contratos
- [ ] Chore (configuração, dependências, CI)

## Checklist

### Geral
- [ ] Build passa (`pnpm build` ou `npm run build`)
- [ ] Lint passa sem erros (`pnpm lint` ou `npm run lint`)
- [ ] Typecheck passa (`npm run typecheck`)
- [ ] Nenhuma chave, secret ou credencial exposta no código
- [ ] Nenhuma variável de ambiente nova sem entrada no `.env.example`

### Comportamento do Core
- [ ] Nenhum comportamento existente foi alterado (webhook, cálculo de frete, sessões)
- [ ] Mudanças de breaking change foram documentadas

### LLM / Orchestrator (quando aplicável)
- [ ] Output do LLM é validado contra `LLMOutputSchema`
- [ ] Tool invocada está na allowlist (`TOOL_ALLOWLIST`)
- [ ] Evento `TOOL_CALLED` é logado antes da execução
- [ ] Guardrails de injection e PII masking aplicados

### Providers / Integrações (quando aplicável)
- [ ] Provider implementa `IProvider<TInput, TOutput>`
- [ ] Fallback declarado para providers críticos
- [ ] Timeout configurado (read: 5s, write: 10s)
- [ ] Erros encapsulados em `ProviderError` — sem exceções raw

### Banco de Dados (quando aplicável)
- [ ] Migrations criadas para mudanças de schema
- [ ] `tenantId` presente em todas as queries multi-tenant
- [ ] Idempotency key em operações mutantes

### Eventos / Auditoria (quando aplicável)
- [ ] Eventos seguem o modelo em `docs/os/event-model.md`
- [ ] `correlation_id` propagado por toda a cadeia
- [ ] PII mascarado antes do log

### Fallback / Rollback
- [ ] Mudança é reversível sem perda de dados
- [ ] Em caso de falha, o sistema degrada graciosamente

### UI / Cockpit (quando aplicável)
- [ ] Componentes usam tokens do namespace `--os-*`
- [ ] Tema claro/escuro/sistema funcionando
- [ ] Acessibilidade: `aria-label` em botões, foco visível, área de toque ≥ 44px

## Screenshots (opcional)

<!-- Adicione capturas de tela para mudanças visuais. -->

## Notas para o Reviewer

<!-- O que não foi feito? O que pode ser melhorado no futuro? Contexto adicional. -->

---

> **Lembre:** Este PR pertence a `claude/condstore-os-scaffold-dsloU` ou branch de feature. Nunca force-push em `main`.
