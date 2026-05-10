# Contrato Operacional CONDSTORE OS

## 1. Objetivo

Este contrato operacional existe para padronizar a execução do MVP com disciplina e previsibilidade. O foco é eliminar duplicidade entre ferramentas, manter rastreabilidade ponta a ponta e definir, sem ambiguidade, a fonte de verdade de cada tipo de informação.

Ele também formaliza que DONE só existe com evidência real verificável e separa claramente camadas de estratégia, execução técnica, documentação e comunicação.

Objetivos práticos deste contrato:

- evitar duplicidade de gestão e execução;
- garantir rastreabilidade entre demanda, execução, validação e fechamento;
- definir fonte de verdade por domínio operacional;
- impedir fechamento sem prova objetiva;
- separar estratégia, execução técnica, documentação e comunicação.

## 2. Regra central da operação

> **ClickUp governa.**
> **Linear executa engenharia.**
> **GitHub prova.**
> **CI valida.**
> **Notion lembra.**
> **Slack avisa.**
> **Agente executa.**
> **Guto/owner humano decide DONE.**

## 3. Papel de cada ferramenta

| Ferramenta | Papel oficial | O que entra aqui | O que NÃO entra aqui | Fonte de verdade para quê |
|---|---|---|---|---|
| ClickUp | Painel operacional e governança executiva | Roadmap, produto, marketing, prioridades, governança, dashboard executivo, go/no-go | Detalhe operacional de execução técnica de engenharia | Direção executiva, prioridade e decisão de negócio |
| Linear | Gatilho executável e esteira técnica | Execução técnica, bugs, PR-blocks, cycles, tarefas de agentes técnicos (Codex), status de engenharia | Documentação estratégica longa, memória institucional, governança executiva | Estado operacional de execução de engenharia |
| GitHub | Fonte técnica absoluta | Código, branches, commits, PRs, reviews, merge, CI/CD | Gestão executiva, priorização de roadmap, decisões estratégicas longas | Verdade técnica do software e histórico de mudanças |
| GitHub Actions / CI | Gate objetivo de qualidade | Typecheck, testes, segurança, validações automatizadas, deploy/Vercel quando aplicável | Planejamento de demanda, decisão de produto, documentação estratégica | Resultado técnico validado de build/test/security |
| Notion | Memória estratégica e operacional de conhecimento | Decisões, ADRs, runbooks, retrospectivas, acordos de arquitetura/processo | Tracking operacional diário de execução técnica | Histórico de decisões e documentação viva |
| Slack | Canal de comunicação rápida e alerta | Alertas, notificações de PR/CI/blockers, comunicação rápida de coordenação | Fonte de verdade, decisão final sem registro, tracking estruturado | Comunicação e sincronização em tempo real |
| Google Drive | Repositório de anexos e artefatos externos | Arquivos de apoio, apresentações, materiais anexos, documentos complementares | Gestão de execução técnica, documentação viva principal de processo | Arquivos brutos e anexos externos |
| Perplexity | Pesquisa externa e benchmark | Pesquisa de mercado, referências externas, validação estratégica, benchmark | Registro final de decisão operacional interna | Base de pesquisa externa e inteligência de contexto |
| Jules | Agente executor e auditor técnico | Execução de PRs fechadas com escopo claro e auditoria via issue GitHub | Decisão estratégica, merge autônomo, DONE final | Execução automatizada com evidência de implementação |
| Antigravity | Agente auditor/executor com MCP | Auditoria técnica e execução via MCP quando bridge estiver validado | Operação sem bridge validado, autoridade final de fechamento | Evidência técnica de auditoria e execução assistida |
| Codex | Execução técnica via Linear delegate | Código, testes, correções pontuais e documentação no repositório via issue Linear | Autoridade de DONE final, decisão estratégica sem owner, disparo via ClickUp | Entrega técnica/documental versionada |
| Claude | Auditoria e revisão profunda | Análise de risco, arquitetura, LGPD, revisão técnica e documental | Execução operacional sem escopo fechado nem owner humano | Parecer analítico e recomendações estruturadas |
| Gemini | Auditoria e revisão profunda | Análise de risco, arquitetura, LGPD, documentação e revisão crítica | Substituir governança de ferramentas oficiais de execução | Parecer analítico complementar |

## 4. Fluxo operacional mínimo

Fluxo oficial:

```text
Ideia / demanda
→ Triagem
→ Refinamento
→ Execução
→ PR / entrega
→ CI
→ Auditoria
→ DONE
→ Aprendizado
```

| Etapa | Ferramenta principal | Responsável | Evidência mínima |
|---|---|---|---|
| Ideia / demanda | ClickUp | Owner de produto/operação | Item executivo criado com contexto inicial |
| Triagem | ClickUp | Liderança/owner | Priorização explícita e decisão de encaminhamento |
| Refinamento | ClickUp + Linear | Produto + engenharia | Issue no Linear com escopo, fora de escopo e critérios de validação |
| Execução | Linear + GitHub | Engenharia/Agente executor | Branch + commits vinculados à issue |
| PR / entrega | GitHub | Autor da mudança + reviewer | PR aberta referenciando issue e descrevendo evidências |
| CI | GitHub Actions / CI | Pipeline automatizado | Status verde dos gates aplicáveis (ou N/A justificado) |
| Auditoria | Linear + GitHub + Notion (quando necessário) | Revisor técnico + owner | Confirmação de diff, riscos e aderência ao DONE |
| DONE | Linear (com validação humana) | Owner humano responsável | Atualização para DONE com links de evidência anexados |
| Aprendizado | Notion | Owner + time | Registro de decisão, lições e ajustes de processo |

## 5. Regra de DONE

Uma tarefa técnica só pode ser considerada DONE quando:

- existe issue no Linear;
- existe PR no GitHub, quando aplicável;
- PR referencia a issue;
- CI passou;
- typecheck passou;
- testes relevantes passaram ou N/A foi justificado;
- security gate passou, se aplicável;
- migrations foram commitadas, se houver;
- zero schema drift, se aplicável;
- diff foi conferido;
- documentação foi atualizada, se necessário;
- evidência foi anexada no Linear;
- owner humano validou.

> DONE sem evidência real não é DONE.

## 6. Regras para agentes

Agente pode executar quando:

- escopo está fechado;
- fora de escopo está explícito;
- branch esperada está clara;
- PR esperada está clara;
- critérios de validação estão definidos;
- riscos estão mapeados.

Agente **NÃO** deve executar quando:

- a decisão ainda é estratégica;
- a tarefa está vaga;
- há risco em auth, tenant, billing, LGPD ou migration crítica sem auditoria;
- não existe critério de DONE;
- não existe evidência esperada.

Papel por agente:

- **Jules**: executor principal de PRs fechadas e auditor técnico por issue GitHub quando o escopo está fechado.
- **Antigravity**: auditor técnico / executor com MCP, somente se bridge estiver validado.
- **Codex**: executor técnico via Linear delegate para código, testes e correções pontuais; executor documental quando a entrega for arquivo versionado no repositório.
- **Claude/Gemini**: auditoria, análise de risco, arquitetura, LGPD, documentação e revisão profunda.
- **Perplexity**: pesquisa externa, benchmark, estratégia e validação de mercado.

## 7. Regras contra duplicidade e Gatilhos de Agentes

- **Gatilho Codex**: Menção ao Codex no ClickUp **NÃO** dispara o agente. Uma tarefa para o Codex precisa obrigatoriamente de uma issue no Linear delegada a ele.
- **Painel Único**: A tarefa no ClickUp deve apontar para a issue correspondente no Linear e funcionar como painel único de visibilidade executiva.
- Não criar a mesma tarefa técnica completa no ClickUp e no Linear.
- ClickUp pode ter item executivo que aponta para uma ou mais issues do Linear.
- Linear não substitui ClickUp para roadmap, marketing e produto.
- GitHub não substitui Linear para gestão de execução.
- Slack não substitui Notion para decisões.
- Notion não substitui Linear para execução.
- Google Drive não substitui Notion para documentação viva.

## 8. Evidências obrigatórias por tipo de tarefa

| Tipo de tarefa | Ferramenta principal | Evidência obrigatória |
|---|---|---|
| Feature técnica | Linear + GitHub + CI | Issue, PR vinculada, diff revisado, CI verde, validação humana |
| Bug | Linear + GitHub + CI | Issue com reprodução, correção em PR, teste/validação, CI verde |
| Auditoria de PR | GitHub + Linear | Comentários de revisão, parecer técnico, decisão registrada |
| Release / Go-No-Go | ClickUp + GitHub + CI | Decisão go/no-go, status de riscos, resultado dos gates |
| Marketing / copy | ClickUp + Notion | Entrega revisada, aprovação de owner, versão final registrada |
| Branding / UI | ClickUp + GitHub/Drive (quando aplicável) | Artefato final, revisão, vínculo com demanda executiva |
| Documentação | Notion + repositório (quando versionada) | Documento atualizado, data, owner e contexto da mudança |
| Pesquisa estratégica | Perplexity + Notion | Fontes consultadas, síntese, recomendação prática |
| Decisão operacional | ClickUp + Notion | Registro da decisão, responsável, impacto e próximos passos |
| Tarefa executada por agente | Linear + GitHub | Prompt/escopo, output estruturado, commits/PR, validação humana final |

## 9. Decisão final de arquitetura operacional

- ClickUp será a central executiva e de governança.
- Linear será a esteira técnica de engenharia.
- GitHub será a fonte de verdade técnica.
- Notion será a memória de decisões e documentação.
- Slack será apenas canal de alerta e comunicação.
- Agentes serão força de execução/auditoria, não autoridade final.

## 10. Checklist de validação do contrato

- [ ] O papel de cada ferramenta está claro
- [ ] Não há duplicidade entre ClickUp e Linear
- [ ] DONE técnico exige evidência real
- [ ] GitHub/CI continuam como fonte de verdade técnica
- [ ] Slack não é fonte de decisão
- [ ] Agentes não declaram DONE final
- [ ] Decisões importantes têm destino definido
- [ ] O fluxo mínimo cabe na operação atual do MVP
