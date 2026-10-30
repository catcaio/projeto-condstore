# Cockpit Operacional de E-commerce — Etapa 1

Registro técnico e runbook de homologação, atualizado em 30/10/2026.

**Estado: NÃO CONCLUÍDO / NOT DONE.** A fundação foi implementada e os testes listados abaixo passaram. A aplicação da migration, a persistência em MySQL, a demonstração autenticada no navegador e os gates finais de entrega ainda precisam de evidência. As Etapas 2 e 3 não foram iniciadas.

## Escopo entregue

A rota autenticada `/cockpit/gestao-ecommerce` apresenta as seis frentes permanentes, projetos, ficha estratégica, entregáveis da EAP/WBS, tarefas, atividades, histórico, evidências, próximos marcos, bloqueios e decisões pendentes. A navegação aceita `frontCode` e `projectId`.

O ClickUp permanece como ambiente de gestão do trabalho. O Condstore apresenta uma projeção persistida no banco existente. A Etapa 1 oferece apenas configuração administrativa e preparação explícita da demonstração; não implementa edição gerencial de projetos, importação, webhook, sincronização incremental, relatório semanal automático ou conector comercial.

| Código | Frente |
|---|---|
| F01 | Operação |
| F02 | Catálogo |
| F03 | Comercial |
| F04 | Performance |
| F05 | Expansão |
| F06 | Inteligência |

Shopee, Amazon e TikTok Shop são temas de estudo da frente Expansão. Não possuem integração implementada nesta entrega.

## Auditoria e reutilização

A execução partiu de uma cópia isolada da `origin/main`, na branch `feat/indiana-cockpit-foundation`. A cópia local anterior foi preservada: estava oito commits atrás da referência remota inspecionada e apresentava exclusões extensas de fontes, scripts e testes. A base remota usada foi `aed72347efac1a74f8d0d0bb04e7a6f3ed183d83`.

Foram reutilizados o AppShell, o Design System, os papéis existentes, a sessão autenticada, os guards de API, o cliente lazy de banco, o schema Drizzle e as entidades `governance_*`. O serviço legado `governance.service.ts`, que retorna valores demonstrativos fixos, não participa do novo fluxo.

Os dados de engenharia de `project_reports` não foram usados para registros da Indiana: essa tabela não possui `tenantId`. A fundação não depende de `localStorage` para compartilhar projetos e histórico entre dispositivos. Os ajustes do dashboard executivo incluídos na mesma frente removem apresentação silenciosa de dados demonstrativos; não constituem a implementação dos indicadores comerciais da Etapa 3.

## Decisão de persistência

**Decisão:** reutilizar o domínio de governança e acrescentar somente `governance_projects.ecommerce_metadata`, uma coluna JSON nullable. Não criar outro banco nem outro gerenciador de tarefas.

| Entidade existente | Uso no cockpit |
|---|---|
| `governance_spaces` | Frentes, com slugs `ecommerce-f01` a `ecommerce-f06` |
| `governance_projects` | Identidade, nome, descrição, estado e ficha estratégica do projeto |
| `governance_lists` | Agrupamento da EAP/WBS por projeto |
| `governance_tasks` | Entregáveis com `taskType=deliverable`; tarefas filhas com `parentTaskId` |
| `governance_task_events` | Histórico e registros estruturados de execução |
| `tenant_configurations` | Chave `cockpit.gestao-ecommerce`: nome da operação e vínculo do workspace |
| `tenant_events` | Auditoria de configuração e preparação da demonstração |

A metadata de projeto usa `module=ecommerce` e `version=1`, com validação estrita. Contém código, frente, identificação de demonstração, problema, objetivo, diagnóstico, hipótese, KPI associado, responsável, atribuições de acesso, prioridade, início, previsão, próximo marco, evidências, resultado observado, aprendizado, bloqueios, decisões e origem. A origem contém tipo, ID externo opcional, URL HTTPS opcional e horário informado pela fonte.

Os estados são `backlog`, `planned`, `in_progress`, `in_validation`, `completed`, `blocked` e `cancelled`, apresentados como Backlog, Planejado, Em andamento, Em validação, Concluído, Bloqueado e Cancelado.

As relações são verificadas no backend: tenant da linha, projeto da lista, projeto/lista do entregável, pai da tarefa e pertencimento do evento. Tarefas órfãs ou relações com outro tenant não concedem acesso nem entram nos resumos.

Um evento `activity.completed` exige identidade própria e payload com `occurredAt`, `activityType`, `quantity`, `description`, `evidence`, `responsible` e `nextStep`. Alterações de status ou descrição permanecem no histórico e não contam como execução. Eventos repetidos são deduplicados por ID. Entregas recentes exigem um evento `task.completed`; a simples atualização de uma linha não fornece data de conclusão.

**Consequência:** o ClickUp continua canônico. O modelo local fornece leitura compartilhada e rastreabilidade, sem exigir uma segunda rotina de preenchimento de tarefas. A futura ingestão de dados externos depende da aprovação da Etapa 2.

## Migration e limite da verificação de drift

A migration `drizzle/0083_indiana_cockpit_foundation.sql` possui cinco `CREATE TABLE IF NOT EXISTS`, com as colunas e os índices atuais das tabelas reutilizadas, seguidos do `ALTER TABLE governance_projects ADD ecommerce_metadata json` gerado pelo Drizzle. Snapshot `0083` e journal acompanham a alteração. Nenhuma migration antiga foi modificada.

O preâmbulo aditivo é necessário porque as cinco tabelas já aparecem no schema e nos snapshots, mas seus comandos de criação não constam no histórico SQL versionado inspecionado. Ele preserva tabelas existentes e não pretende reparar todas as lacunas do histórico completo do projeto. A coluna é nullable para manter compatibilidade com projetos de outros consumidores.

A segunda geração Drizzle retornou `No schema changes, nothing to migrate`. Isso comprova alinhamento entre schema e snapshot versionados. `npm run db:verify` também opera por geração e inspeção do Git; **não comprova conectividade, aplicação de DDL ou alinhamento com um banco vivo**.

Na tentativa de homologação, `localhost:3306` recusou conexão. A tentativa de iniciar o Docker Desktop não disponibilizou o engine. A causa dessa falha não foi determinada. Nenhuma operação de produção foi executada.

Para continuar, o titular precisa disponibilizar um MySQL de teste acessível, confirmar que o destino não é produção e fornecer o acesso pelo mecanismo local de configuração, sem registrar credenciais nesta documentação, no Git ou nos logs.

Procedimento de banco, somente após essa confirmação:

1. Registrar versão, identificação não sensível e estado inicial do banco de teste; realizar backup verificável antes de DDL.
2. Comparar as cinco tabelas e a coluna nova com o schema. `IF NOT EXISTS` não corrige uma tabela existente com estrutura divergente.
3. Rever o histórico de migrations aplicado. Não executar `npm run db:push` nem toda a cadeia histórica sem revisar os gaps anteriores a `0083`.
4. Em banco com baseline compatível confirmado, aplicar a migration `0083` pelo procedimento de migração controlado do projeto. Em banco vazio, preparar primeiro a baseline necessária do projeto, incluindo autenticação, configuração e auditoria; a `0083` não substitui essa baseline.
5. Conferir tabelas, coluna, índices e registro de migration aplicada. Executar novamente a geração Drizzle para detectar alterações inesperadas.
6. Homologar a configuração administrativa e o seed pela API autenticada; recarregar a página e repetir a leitura em outra sessão autorizada.

Não há instrução de aplicação em produção neste runbook.

## Segurança e autorização

O tenant, o usuário e o papel vêm exclusivamente da sessão autenticada. Query, body e headers fornecidos pelo cliente não substituem esse contexto.

O **projeto é a unidade de autorização**. O acesso a um projeto autorizado inclui sua ficha, seus entregáveis, tarefas e eventos válidos. As agregações são calculadas após essa autorização.

| Papel | Leitura | Escrita no módulo |
|---|---|---|
| `admin` | Projetos do tenant | Somente configuração e preparação da demonstração |
| `manager` | Projetos do tenant | Não permitida |
| `operator` | Projetos criados pelo usuário, atribuídos na metadata ou com tarefa válida atribuída ao usuário | Não permitida |
| `viewer` | Somente projetos com `sharedForViewers=true` explicitamente definido | Não permitida |

Consultas diretas a projeto inexistente ou não autorizado produzem o mesmo snapshot sem esse projeto. Contagens, histórico e horários dos projetos privados não aparecem nos resumos de usuários sem acesso.

As respostas de dados usam `Cache-Control: private, no-store` e `Vary: Cookie`. O POST exige `requireAdmin`, `Origin` igual à origem da requisição e `Content-Type: application/json`. Campos adicionais, parâmetros de query em POST e filtros repetidos são rejeitados. Tokens e credenciais não fazem parte dos contratos públicos. Falhas de persistência retornam erro genérico, sem conexão ou segredo no payload.

## ClickUp configurado e exceção aprovada

O pedido original exigia workspace independente. Durante a execução, **o usuário aprovou expressamente usar o workspace atual em substituição a essa exigência**. Essa autorização é uma exceção de escopo desta entrega; não deve ser descrita como criação de workspace independente.

| Recurso | Identificação |
|---|---|
| Workspace aprovado | `90171032603`, nome `Workspace` |
| Pasta da operação | `901712085226` |
| Lista F01 — Operação | `901718049801` |
| Lista F02 — Catálogo | `901718049803` |
| Lista F03 — Comercial | `901718049804` |
| Lista F04 — Performance | `901718049805` |
| Lista F05 — Expansão | `901718049806` |
| Lista F06 — Inteligência | `901718049807` |

Projeto de exemplo: [CAT-001 | Otimização dos 100 anúncios prioritários](https://app.clickup.com/t/86e3xj690), com quatro entregáveis demonstrativos:

1. [Diagnóstico dos anúncios prioritários](https://app.clickup.com/t/86e3xj6p6).
2. [Definição de critérios de qualidade](https://app.clickup.com/t/86e3xj6pa).
3. [Execução e validação das otimizações](https://app.clickup.com/t/86e3xj6pc).
4. [Medição dos resultados e conclusão](https://app.clickup.com/t/86e3xj6pg).

Os IDs acima documentam recursos externos preparados. Eles não são defaults de runtime nem vinculam automaticamente um tenant. O compartilhamento continua sujeito ao workspace existente; o uso de dados reais requer verificar o acesso autorizado nesse ambiente. A configuração local do workspace indica `awaiting_verification`, sem afirmar autenticação de integração, importação ou sincronização.

## Uso da API

Leitura autenticada:

```http
GET /api/cockpit/gestao-ecommerce
GET /api/cockpit/gestao-ecommerce?frontCode=F02
GET /api/cockpit/gestao-ecommerce?frontCode=F02&projectId=ID_LOCAL_DO_PROJETO
```

O `projectId` é o ID local retornado pelo cockpit ou pelo seed. Não usar o ID da tarefa ClickUp como se fosse o ID persistido do projeto.

Configuração administrativa, enviada pelo formulário do cockpit ou em requisição autenticada da mesma origem:

```json
{
  "action": "configure",
  "operationName": "INDIANA | Gestão de E-commerce",
  "workspace": {
    "id": "90171032603",
    "name": "Workspace"
  }
}
```

Resposta esperada: `{"configured":true,"syncStatus":"awaiting_verification"}`. Esse retorno comprova somente armazenamento da configuração quando a chamada for efetivamente executada com sucesso.

Preparação explícita da demonstração, no mesmo endpoint:

```json
{ "action": "seed_demo" }
```

O seed cria seis frentes, o projeto CAT-001 e quatro entregáveis planejados. Usa IDs determinísticos por tenant, transação e inserts que preservam registros existentes. Repetir a ação não duplica projetos, entregáveis ou o evento de preparação. Ela não é executada ao abrir a página e não cria atividades concluídas, vendas ou resultados.

O histórico visível recebe um único evento idempotente `demo.seeded`, ligado ao primeiro entregável e ao administrador da sessão, que registra somente o cadastro do exemplo e não conta como execução.

Exemplo de chamada na origem do aplicativo, após login de administrador:

```javascript
const response = await fetch('/api/cockpit/gestao-ecommerce', {
  method: 'POST',
  credentials: 'same-origin',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'seed_demo' })
});
if (!response.ok) throw new Error(`Falha HTTP ${response.status}`);
const result = await response.json();
```

O navegador fornece a origem da requisição e a sessão existente. Não copiar cookies, tokens ou credenciais para exemplos, relatórios ou ferramentas externas.

## Verdade dos dados apresentados

Registros demonstrativos são identificados por `isDemo=true` e `source.type=demonstration`. A validação impede combinações inconsistentes. Eles podem ser navegados, mas são excluídos de contagens operacionais de projetos ativos, entregáveis concluídos e atividades concluídas. A quantidade demonstrativa por frente aparece separadamente em `demoProjectCount`.

Progresso da WBS mede entregáveis concluídos. Quantidade de atividades mede registros estruturados de execução. Nenhuma dessas medidas representa impacto em receita ou conversão. KPIs comerciais sem fonte permanecem indisponíveis; não recebem números demonstrativos como fallback. As datas persistidas mantêm instantes ISO/UTC e a apresentação usa `America/Sao_Paulo`.

Sem registros, a interface apresenta estado vazio. Falha de banco apresenta erro recuperável, sem substituir dados por mocks. A indisponibilidade do ClickUp não deve retirar a leitura dos registros já persistidos: a Etapa 1 não faz chamadas autenticadas ao ClickUp durante a leitura.

## Evidências automatizadas consolidadas

As contagens abaixo se referem às execuções da frente registradas antes do gate final. São conjuntos parcialmente sobrepostos e não devem ser somados como uma suíte única.

| Verificação | Resultado registrado |
|---|---|
| Backend: serviço, repository e API | 47 testes aprovados |
| UI do cockpit | 22 testes aprovados |
| Navegação | 5 testes aprovados |
| Contrato canônico do menu | 8 testes aprovados; inclui rota, ordem, unicidade e quatro perfis |
| Contrato de segurança com JWT | 7 testes aprovados |
| Regressão do dashboard legado | 11 testes aprovados |
| `npm run test:cockpit` | 97 testes aprovados |
| Typecheck global | Aprovado |
| Lint global | Aprovado |
| Verificação de rotas e guards | Aprovada nas execuções registradas |
| Isolamento de tenant | Gate aprovado; 193 queries inspecionadas |
| `npm run db:verify` | Aprovado offline; sem drift entre schema e migrations commitadas |
| Conjunto final da Etapa 1 | 95 testes aprovados em 9 arquivos; conjuntos acima se sobrepõem |
| Persistência MySQL e aplicação da migration | Bloqueadas por conectividade |
| Demonstração manual desktop/celular | Pendente |
| Build local final | Aprovado, incluindo compilação TypeScript e geração das rotas |
| Coverage local amplo | 1.400 testes aprovados, 3 timeouts em Frank e 13 ignorados; exit 1, não aprovado |
| PR | [#427, em rascunho](https://github.com/catcaio/projeto-condstore/pull/427); CI do último push deve ser conferido antes do Gate 1 |

A branch `feat/indiana-cockpit-foundation` partiu de `aed72347efac1a74f8d0d0bb04e7a6f3ed183d83` e foi atualizada sem conflitos sobre `3005194a34b51a09e95d9a473e837cc2886e1d62`. A cópia original e suas exclusões locais foram preservadas.

O CI inicial identificou uma expectativa antiga do menu, corrigida para incluir o módulo solicitado e acrescentar verificações de rota/perfis/ordem. O Dependency Audit encontrou 11 vulnerabilidades (2 moderadas, 7 altas e 2 críticas) em dependências existentes; `package.json` e `package-lock.json` não têm diff nesta entrega. Não foi feita atualização ampla de dependências fora do escopo.

Os timeouts locais foram comparados com a base sem editar asserts ou aumentar limites de tempo. Em uma comparação de sete arquivos, a branch teve 12 falhas e a base 7; cinco falhas exclusivas daquela execução não foram classificadas como preexistentes. Na comparação posterior de três arquivos Frank, a branch teve 1 timeout e a base 3, em casos alternados. Isso evidencia instabilidade temporal, mas não transforma a execução ampla em aprovada. O CI do HEAD publicado é uma evidência separada.

O teste HTTP local com sessão assinada confirmou 401 sem sessão/cookie inválido, redirecionamento da página anônima, 403 para escrita de manager e para Origin externo, 400 para sobrescrita de tenant, redirecionamento de manager no laboratório e 200 para administrador no laboratório.

O usuário autorizou posteriormente testar no banco real. A conexão fornecida ainda retornou `ECONNREFUSED`; a configuração local original tem `DATABASE_URL` vazio. O conector Vercel negou a leitura das variáveis (403) e a credencial CLI não disponibilizou acesso. Nenhuma credencial real foi obtida, nenhuma migration foi aplicada e nenhum dado operacional foi alterado.

Comandos reproduzíveis, conferidos no `package.json` desta base:

```powershell
npm run test:win-stable -- src/modules/cockpit/gestao-ecommerce/service.test.ts src/modules/cockpit/gestao-ecommerce/repository.test.ts src/app/api/cockpit/gestao-ecommerce/route.test.ts
npm run test:cockpit
npm run typecheck
npm run lint
npm run check:boundaries
npm run routes:verify-security
npm run verify:tenant-isolation
npm run guardrail:mvp-freeze
npm run db:verify
```

Os testes de transação/idempotência do repository usam executor simulado e os testes de UI não substituem homologação no navegador. A aprovação desses testes não comprova aplicação no MySQL.

## Homologação manual pendente

Executar em ambiente de teste confirmado, com dados sintéticos e pelo menos dois tenants:

1. Abrir a rota sem sessão e verificar bloqueio de acesso; autenticar um administrador e abrir o cockpit.
2. Confirmar seis frentes e estado vazio antes de qualquer seed. Configurar o workspace pela ação administrativa.
3. Preparar a demonstração, abrir F02, CAT-001 e os quatro entregáveis. Verificar indicação de demonstração e ausência de vendas fictícias.
4. Recarregar, encerrar e reabrir a sessão; confirmar persistência no banco e leitura em outro dispositivo autorizado.
5. Repetir o seed e comparar contagens e IDs. Simular uma falha de escrita em banco de teste e conferir ausência de criação parcial.
6. Usar `manager`: permitir leitura e negar POST direto com HTTP 403. Repetir a negação de escrita com `operator` e `viewer`.
7. Usar projetos sintéticos atribuídos e não atribuídos: operador vê apenas os autorizados; viewer vê apenas os explicitamente compartilhados. Comparar consulta de ID privado com ID inexistente.
8. Usar um segundo tenant: projetos, tarefas, eventos, configuração e contagens do primeiro tenant não podem aparecer. Testar tentativas de enviar `tenantId`, `userId` ou `role` no body/query/header.
9. Registrar eventos sintéticos de status, descrição, execução e conclusão de entregável. Confirmar que somente `activity.completed` válido conta como execução e que a mesma identidade não é contada duas vezes.
10. Verificar desktop e celular: navegação por teclado, cards, ficha, histórico, estados de loading/erro/vazio e ausência de rolagem horizontal desnecessária.
11. Interromper o banco de teste e confirmar erro explícito, sem mock. Restaurar o banco e recuperar a visualização.
12. Confirmar leitura dos dados persistidos sem dependência de disponibilidade do ClickUp. A comprovação de uma alteração externa refletida automaticamente pertence à Etapa 2 e permanece fora desta homologação.

Registrar capturas, resultados HTTP, contagens/IDs sintéticos e evidência da migration aplicada. Não registrar cookies ou outros segredos.

## Rollback e recuperação

O rollback operacional consiste em reverter o commit da aplicação pela política de PR do projeto. Manter as tabelas reutilizadas e a coluna nullable; versões anteriores não dependem da metadata nova. Não executar `DROP TABLE`, apagar projetos ou remover histórico como parte do rollback.

Para desfazer uma configuração incorreta, usar a ação administrativa `configure` com os valores corrigidos, preservando auditoria. Para corrigir dados de demonstração em teste, preservar primeiro a evidência e o backup; qualquer remoção de dados deve ter escopo e autorização próprios. Não há endpoint de exclusão de projetos nesta entrega.

DDL MySQL não deve ser tratado como transação reversível de aplicação. Antes de repetir uma migration após falha, conferir quais statements foram aplicados e seu registro de versão. O `ALTER ADD` é uma evolução versionada única, embora os cinco `CREATE IF NOT EXISTS` sejam idempotentes.

## Gate 1 e pendências

- [x] Arquitetura existente auditada e reaproveitada.
- [x] Exceção de uso do workspace atual aprovada pelo usuário e documentada.
- [x] Estrutura externa das seis frentes e exemplo CAT-001/WBS identificados.
- [x] Código da rota, navegação, projeção, autorização e setup administrativo implementado.
- [x] Demonstração separada de dados operacionais nos contratos e resumos.
- [x] Testes automatizados indicados aprovados; migration e snapshot preparados.
- [ ] MySQL de teste acessível e baseline confirmada.
- [ ] Migration aplicada e schema vivo conferido.
- [ ] Persistência após recarregamento e entre dispositivos demonstrada.
- [ ] Perfis, tenants e falhas homologados no fluxo autenticado completo.
- [ ] Desktop e celular homologados no navegador.
- [ ] Build, coverage, diff final, PR e CI do HEAD final avaliados.
- [ ] Relatório final revisado e aprovação explícita para avançar à Etapa 2.

O bloqueio externo atual exige disponibilizar o MySQL de teste. A Etapa 1 permanece **NOT DONE** até o fechamento dessas evidências. Nenhum merge, deploy ou mudança de produção está autorizado por este documento.
