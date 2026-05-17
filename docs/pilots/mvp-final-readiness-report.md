# MVP Final Readiness Report — CONDSTORE OS

**Data da auditoria:** 2026-05-17  
**Branch:** `chore/p2-mvp-final-readiness`  
**Main auditada:** `f4749ecdfa7233ec0e8f3255ec883d4ce0855af1`  
**Status final:** `GO COM RESSALVA` para abrir PR de consolidação documental; piloto real ainda depende de execução supervisionada e checklist pós-piloto.

## Estado final do MVP

O MVP está tecnicamente consolidado para iniciar um piloto real supervisionado. O estado atual não declara piloto real concluído, resultado comercial validado nem mini-case pós-piloto.

Classificação operacional:

| Camada | Status | Evidência |
|---|---|---|
| MVP tecnicamente pronto | OK com ressalva | Tarefa 1/5 validou main com ressalva não bloqueante de Vitest threads no Windows VM; trilho local estável: `npm run test:win-stable`. |
| Validação operacional controlada | OK | Tarefa 2/5 registrou evidências reais e sanitizadas em `docs/pilots/pilot-01-operational-checklist.md` para tenant controlado. |
| Piloto real supervisionado | Próximo ciclo | Requer operador humano, kill switch, métricas reais e checklist pós-piloto. |
| Mini-case pós-piloto | Não iniciado | Só pode ser produzido após `docs/pilots/pilot-01-post-pilot-checklist.md` completo com dados reais. |

## Validações das tarefas 1/5 a 4/5

- **Tarefa 1/5:** main tecnicamente pronta, com ressalva não bloqueante de instabilidade de Vitest threads em Windows VM.
- **Tarefa 2/5:** Piloto 01 validado em modo operacional controlado, com evidências sanitizadas no checklist operacional.
- **Tarefa 3/5:** PR #328 mergeada — cockpit canônico em `/cockpit`, remoção do `/dashboard` legado como orientação ativa e fallback honesto.
- **Tarefa 4/5:** PR #329 mergeada — governança de repo, CODEOWNERS, PR template e workflows de agentes.

## PRs relevantes

- PR #328: https://github.com/catcaio/projeto-condstore/pull/328
- PR #329: https://github.com/catcaio/projeto-condstore/pull/329

## Gates executados nesta consolidação

| Gate | Resultado | Observação |
|---|---|---|
| `npm run lint` | PASS local | Exit code 0. |
| `npm run typecheck` | PASS local | Exit code 0. |
| `npm run routes:verify-security` | PASS local | Exit code 0; 195 rotas protegidas com guardrails e sem extração insegura de tenant/user via request. |
| `npm run db:verify` | PASS local com ressalva | Exit code 0; rodou em modo offline porque `DATABASE_URL` não estava presente no shell local; schema alinhado com migrations commitadas. |
| `npm run test:win-stable` | PASS local | Exit code 0; trilho estável em Windows VM. |
| `npm run pilot:readiness` | PASS local com ressalva | Exit code 0; emitiu avisos `MANUAL_RAFA` para envs de Google/SMTP/Stripe e não prova piloto real concluído. |
| `npm run mvp:release-candidate` | PASS local com ressalva | Exit code 0; emitiu avisos `MANUAL_RAFA` e assumiu login/API sem servidor local ativo; é gate técnico, não prova resultado comercial. |
| `npm run build` | PASS local com warning | Exit code 0; build gerou warning de `middleware` deprecated/proxy e warning Turbopack NFT em rota interna Qdrant, sem falha de build. |
| `npm run guardrail:mvp-freeze` | PASS local | Exit code 0; nenhuma superfície hard-frozen alterada. |
| `npm run scope:pr-tests` | PASS local | Exit code 0; escopo docs-only e comando mínimo sugerido: `npm run guardrail:mvp-freeze`. |

## Auditoria de mocks, fallbacks e valores fictícios

Busca local executada por `mock-data`, `fallback`, `demo`, `N/A`, `126`, `248`, `412` e `17`.

Classificação:

| Classe | Resultado |
|---|---|
| Teste/demo permitido | Diretórios `docs/demo/**`, scripts de seed demo e testes de cockpit usam dados fictícios explicitamente para demo/teste. |
| Fallback explícito permitido | Cockpit usa fallback diagnóstico com `source=fallback`, `fallbackReason` e valores `N/A`, sem KPIs fictícios. Rate limiter, Redis e PII têm fallbacks delimitados por runtime/dev ou modo degradado. |
| Produção suspeita | `src/app/api/cockpit/conversations/[id]/route.ts` usa `N/A`/`<N/A>` para campos ainda não rastreados (`source`, `cidade`, `uf`). Não há evidência de KPI fictício ou decisão automática baseada nesses valores; manter no backlog de refinamento de dados, sem blocker desta PR. |
| Blocker real | Nenhum mock/fallback silencioso bloqueante identificado nesta auditoria documental. |

## Cockpit e rotas

- `/cockpit` é a rota canônica do operador.
- `/dashboard` não deve ser documentado como rota operacional ativa.
- O fallback do cockpit é diagnóstico honesto, com `source=fallback` e `fallbackReason`; não deve ser interpretado como dado real.
- Valores antigos `126`, `248`, `412` aparecem como asserções negativas/testes ou substrings incidentais, não como KPI produtivo de cockpit.

## Riscos remanescentes

- Piloto real ainda não mediu volume real de conversas, cotações, aceites, pedidos, tempos e falhas.
- Integrações externas continuam dependentes de ambiente configurado e monitoramento ativo.
- Mini-case comercial não pode ser publicado sem evidências pós-piloto e aprovação humana.
- Campos operacionais não rastreados ainda podem aparecer como `N/A`; devem ser tratados como lacuna de qualidade de dados, não como prova de operação.

## Ressalvas não bloqueantes

- Vitest em modo `threads` pode ser instável em Windows VM; usar `npm run test:win-stable` como gate local.
- Readiness scripts são evidência técnica, não substituem operação real supervisionada.
- Fallback diagnóstico do cockpit é aceitável porque é explícito e não apresenta dados reais falsos.

## Critérios para iniciar piloto real

- Branch de readiness mergeada na `main`.
- Gates obrigatórios desta PR aprovados ou ressalva formalmente aceita.
- Operador humano definido e treinado no fluxo `/cockpit`.
- Kill switch documentado e acionável.
- Ambiente real com Twilio, banco, Redis, frete e autenticação configurados.
- Plano de coleta de métricas reais aprovado por Rafael/operador.

## Critérios para declarar piloto real concluído

- `docs/pilots/pilot-01-post-pilot-checklist.md` preenchido com dados reais.
- Métricas mínimas consolidadas: conversas, cotações, aceites, pedidos, tempos médios e falhas.
- Screenshots/logs sanitizados anexados.
- Falhas operacionais, UX e dados classificadas.
- Decisão final registrada: expandir, repetir piloto, pausar ou corrigir.
- Rafael e operador humano aprovam interpretação das evidências.

## Checklist pós-piloto

Usar `docs/pilots/pilot-01-post-pilot-checklist.md` como trilho obrigatório para:

- volume real de conversas;
- volume real de cotações e aceites;
- pedidos criados;
- tempos médios;
- falhas;
- evidências sanitizadas;
- mini-case before/after;
- decisão final.

## Próximas decisões humanas

- Rafael confirma se a ressalva de Windows/Vitest threads continua não bloqueante para merge.
- Operador humano confirma disponibilidade para executar o piloto real.
- Rafael/operador definem limite de volume inicial, critérios de pausa e janela de revisão.
- Rafael aprova qualquer uso comercial de mini-case após sanitização e autorização.
