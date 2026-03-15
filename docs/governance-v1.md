# Governance Module V1

## Escopo
Este documento descreve a implementação da V1 do módulo de governança do CONDSTORE.
O módulo introduz o core de gestão de tarefas operacionais nativamente conectado ao ecossistema do sistema, sem depender do `workspace`.

## Entidades
- Spaces (`governance_spaces`)
- Projects (`governance_projects`)
- Lists (`governance_lists`)
- Tasks (`governance_tasks`)
- Comments (`governance_task_comments`)
- Events (`governance_task_events`)
- Links (`governance_task_links`)

## Endpoints
Todos sob `/api/cockpit/governance/*`, protegidos por `requireAdmin`:
- `GET /spaces`, `POST /spaces`
- `GET /projects`, `POST /projects`
- `GET /lists`, `POST /lists`
- `GET /tasks`, `POST /tasks`
- `GET|PATCH /tasks/[taskId]`
- `POST /tasks/[taskId]/comments`
- `GET /tasks/[taskId]/events`
- `GET|POST /tasks/[taskId]/links`
- `GET /projects/[projectId]/board`

## Decisões Arquiteturais
- **Multi-tenant**: Validação estrita de `tenantId` nos repositórios. Nunca aceita o tenant via input (body) na API, derivado sempre da sessão auth.
- **Isolamento**: O `governance` roda em seu próprio domínio de tabelas no DB sem sobrecarregar `workspace`.
- **UI**: Toda a UI base do pacote (Shell, Switcher, Board) foi alocada em `(app)/cockpit/governance` e implementando React UI fluida.
- **Automação Base**: Existe um handler `handleCriticalOperationalEvent` pronto para uso por outros módulos via chamadas diretas aos services para gerar tarefas de type `system` sempre que eventos críticos acontecerem.
