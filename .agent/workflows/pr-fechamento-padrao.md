---
description: Padrão absoluto de validação final a ser executado em todo fechamento de Tarefa e Pull Request no repositório.
---

Este workflow rege as obrigações finais (The Standard Protocol) antes de considerar **qualquer Pull Request** como concluída ou encerrada para revisão na sua base. Nunca entregue uma alteração sem cumprir esse ciclo rígido.

1. **Garantia de Esquema e Drift Nulo**
Em toda etapa envolvendo manipulação de banco/schema, execute a compilação do Drizzle sem hesitação (`npx drizzle-kit generate` ou equivalente parametrizado). Realocar e commitar as migrations e snapshots (`drizzle/` e `drizzle/meta/`) para aniquilar quaisquer drifteos no repositório. Se o gerador acusar `No schema changes`, estará limpo.

2. **Runners e Limites da Branch**
Rode as test tools mandatárias. Neste sistema, são as mínimas obrigações de compilação sem falhas de sintaxe e mock:
- `npm run typecheck`
- `npx vitest run <relacionado-ao-escopo>`

3. **Restrição Intrafuncional (Isolamento Cirúrgico do Git)**
Não faça squash, rebase maluco ou commite lixo. Antes de executar `git add`:
- Invoque `git status` 
- Remova (com `git restore --source=origin/main`) QUALQUER arquivo lateral (e.g. `src/middleware.ts` ou hooks aleatórios) que por ventura sofreram side-effect ou merge conflict. 
Sua `git diff --name-only origin/main...HEAD` precisa ser imaculada e estrita aos arquivos modificados no escopo restrito do ticket.

4. **Injeção do Deploy (O "Empurrar" Remoto)**
Todo fluxo precisa passar incólume por `git push` para sua branch ativa (`origin <branch-nome>`). Códigos parados no local jamais completam a feature. Se as dependências apontavam a necessidade de `commit/push`, assim seja até aparecer a flag de sucesso do Git.

5. **O Status do GitHub no Terminal**
Finalmente, abra a requisição de pull remotamente no serviço final usando:
`gh pr create --title "<Titulo Semântico>" --body "<Descricao>" --base main`
Na resposta final em markdown para o usuário:
- Apresente a URL e o `#Number` da PR em destaque.
- Monitore instantaneamente as travas da CI e dos hooks do repositório (`gh pr checks <PR_NUM>`). Se houver failure nos GitHub Actions que afetam a feature recém submetida, o desenvolvedor deve ser avisado e a falha investigada de imediato.
