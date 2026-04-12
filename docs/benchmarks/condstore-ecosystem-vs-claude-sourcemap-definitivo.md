# Documento Tecnico Definitivo

## Comparativo Forense: leeyeel/claude-code-sourcemap vs catcaio/projeto-condstore

- Repositorio analisado: `leeyeel/claude-code-sourcemap`
- Commit de referencia: `577611a7b32580b5a2e09ff130edfd7709ff11a1`
- Repositorio de comparacao: `catcaio/projeto-condstore`
- Data: `2026-04-01`
- Escopo: ecossistema completo do CONDSTORE (nao restrito ao MVP)

## Premissas de Evidencia

- Cada achado abaixo traz: arquivo, responsabilidade, natureza da conclusao e confianca.
- Natureza usada:
  - `EVIDENCIA EXPLICITA`: comportamento observado diretamente no codigo
  - `INFERENCIA ESTRUTURAL`: deducao de fluxo a partir de chamadas e contratos
  - `HIPOTESE FRACA`: ponto plausivel sem prova completa
- Confianca usada: `ALTA`, `MEDIA`, `BAIXA`.

---

## 1) Inventario Tecnico do Repositorio Analisado (24 arquivos criticos)

| Arquivo | Proposito real | Responsabilidade | Por que importa | Conexao | Natureza | Confianca |
|---|---|---|---|---|---|---|
| `src/entrypoints/cli.tsx` | Bootstrap do runtime CLI | Setup, trust, load de tools e MCP | Entry point real | Aciona `REPL`, `getTools`, `getClients` | EVIDENCIA EXPLICITA | ALTA |
| `src/screens/REPL.tsx` | Interface operacional da sessao | estado, submit, render de loop | Superficie de decisao em runtime | aciona `query` e handlers | EVIDENCIA EXPLICITA | ALTA |
| `src/query.ts` | Nucleo do loop agentic | chamada modelo, parse `tool_use`, recurse | ponto central de execucao | usa `messages`, `claude`, `tools` | EVIDENCIA EXPLICITA | ALTA |
| `src/services/claude.ts` | Adapter do modelo | serializacao API, retry, custo, telemetria | contrato LLM real | consumido por `query.ts` | EVIDENCIA EXPLICITA | ALTA |
| `src/utils/messages.tsx` | Contrato de mensagens | normalize, reorder, merge tool results | define shape operacional | usado por `query` e UI | EVIDENCIA EXPLICITA | ALTA |
| `src/tools.ts` | Registry de tools locais + MCP | `getTools`, filtragem e enablement | define capability set | usa `getMCPTools` | EVIDENCIA EXPLICITA | ALTA |
| `src/permissions.ts` | Policy de permissao | classifica acesso e salva grants | gate de seguranca local | usado por loop e MCP server | EVIDENCIA EXPLICITA | ALTA |
| `src/utils/permissions/filesystem.ts` | Guard de filesystem | grants de leitura/escrita por sessao | isolamento local de IO | acoplado a `permissions.ts` | EVIDENCIA EXPLICITA | ALTA |
| `src/services/mcpClient.ts` | Runtime MCP cliente | conecta, lista tools/prompts e chama servers | extensibilidade externa | alimenta `tools.ts` e comandos MCP | EVIDENCIA EXPLICITA | ALTA |
| `src/entrypoints/mcp.ts` | Runtime MCP servidor | expor tools locais por stdio | fronteira externa de execucao | usa tools e policy local | EVIDENCIA EXPLICITA | ALTA |
| `src/context.ts` | Context builder de sessao | snapshot de repo/git/readme/config | memoria operacional | consumido no ciclo | EVIDENCIA EXPLICITA | ALTA |
| `src/constants/prompts.ts` | Prompts de governanca | system prompt principal e side-agent | molda comportamento | usado por servicos e tools | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/BashTool/BashTool.tsx` | Tool mutante de shell | execucao de comandos e output | maior risco operacional | gated por `permissions.ts` | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/FileReadTool/FileReadTool.tsx` | Tool de leitura | leitura segmentada por linhas | baseline read-only | chamada pelo loop | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/FileEditTool/FileEditTool.tsx` | Tool de edicao | edit incremental + stale-read guard | mutacao de codigo | gated por policy | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/FileWriteTool/FileWriteTool.tsx` | Tool de escrita | escrita integral de arquivo | mutacao direta | gated por policy | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/AgentTool/AgentTool.tsx` | Subagente | execucao sidechain stateless | recurse auxiliar | integrado em registry | EVIDENCIA EXPLICITA | ALTA |
| `src/tools/MCPTool/MCPTool.tsx` | Wrapper de tool externa | padroniza chamada MCP no loop | acoplamento externo | consumido via `getMCPTools` | EVIDENCIA EXPLICITA | ALTA |
| `src/hooks/useCanUseTool.ts` | Mediador UI-policy | pergunta permissao e persiste escolha | decisao humano-no-loop | integra `permissions.ts` | EVIDENCIA EXPLICITA | ALTA |
| `src/components/permissions/PermissionRequest.tsx` | UI de aprovacao | render de pedidos de permissao | governanca interativa | usado por hook de permissao | EVIDENCIA EXPLICITA | ALTA |
| `src/utils/commands.ts` | Parse de comandos bash | split/prefix/injection signals | risco de classificacao errada | usado por `permissions.ts` | EVIDENCIA EXPLICITA | ALTA |
| `src/services/statsig.ts` | Event telemetry de produto | emite eventos de runtime | observabilidade funcional | chamado por varios modulos | EVIDENCIA EXPLICITA | ALTA |
| `src/services/sentry.ts` | Captura de erro | boundary e report | observabilidade de erro | acionado no bootstrap | EVIDENCIA EXPLICITA | ALTA |
| `src/utils/log.ts` | Log transacional local | logs de conversa/erro/sessao | replay e forense | usado no CLI e loop | EVIDENCIA EXPLICITA | ALTA |

---

## 2) Mapa de Dependencias e Pontos Centrais

Relacoes estruturadas:

1. Entrada e bootstrap
- `src/entrypoints/cli.tsx` -> `src/screens/REPL.tsx`, `src/tools.ts`, `src/services/mcpClient.ts`
- Decisao: `--print` usa `ask`; modo interativo usa `REPL`.
- Estado muda: setup inicial, trust, config, cwd.
- Bloqueio: trust dialog e validacoes de ambiente para `dangerously-skip-permissions`.

2. Orquestracao do loop
- `src/screens/REPL.tsx` -> `src/query.ts`
- `src/query.ts` -> `src/services/claude.ts` (modelo), `src/utils/messages.tsx` (normalizacao), tools selecionadas.
- Decisao: se ha `tool_use`, entra em execucao de tools; senao finaliza turno.
- Continuacao: recurse em `query([...messages, assistant, ...toolResults])`.

3. Policy e execucao
- `src/query.ts` -> `checkPermissionsAndCallTool`
- `checkPermissionsAndCallTool` -> `canUseTool` (hook/policy) -> `src/permissions.ts`
- Bloqueio: input invalido, permissao negada, ferramenta inexistente.
- Estado muda: persistencia de `tool_result` na conversa.

4. Runtime externo
- `src/tools.ts` -> `getMCPTools` em `src/services/mcpClient.ts`
- `src/entrypoints/mcp.ts` expande ferramentas locais para MCP server.
- Risco: contrato externo varia por server MCP.

Natureza: `EVIDENCIA EXPLICITA`.
Confianca: `ALTA`.

---

## 3) Agent Loop Real (passo a passo)

1. Ingestao do input
- Arquivo: `src/utils/messages.tsx`
- Funcao: `processUserInput`
- Entrada: prompt, slash command ou bash mode
- Saida: `Message[]`
- Efeito colateral: pode executar bash local direto
- Erro: comando invalido ou erro de shell
- Continuacao: devolve mensagens para o loop
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

2. Preparacao de contexto
- Arquivo: `src/services/claude.ts`
- Funcao: `formatSystemPromptWithContext`
- Entrada: `systemPrompt[]` + mapa de contexto
- Saida: prompt expandido
- Efeito: insere `<context name="...">`
- Erro: nao observado no caminho normal
- Continuacao: query ao modelo
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

3. Chamada ao modelo
- Arquivo: `src/query.ts`
- Funcao: `query` -> `querySonnet`
- Entrada: mensagens normalizadas e tools
- Saida: `AssistantMessage`
- Efeito: telemetria de custo, duracao, retries
- Erro: retorna `AssistantMessage` sintetica com API error
- Continuacao: parse de `tool_use`
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

4. Interpretacao da resposta
- Arquivo: `src/query.ts`
- Funcao: filtro de `tool_use` em `assistantMessage.message.content`
- Entrada: content blocks
- Saida: lista de `ToolUseBlock`
- Erro: se vazio, encerra
- Continuacao: executa tools
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

5. Selecao de tool
- Arquivo: `src/query.ts`
- Funcao: `runToolUse`
- Entrada: `toolUse.name`
- Saida: referencia de `Tool`
- Erro: tool nao encontrada -> `tool_result` erro
- Continuacao: permissao
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

6. Permissao/validacao
- Arquivo: `src/query.ts` e `src/permissions.ts`
- Funcao: `checkPermissionsAndCallTool`, `hasPermissionsToUseTool`
- Entrada: tool + input
- Saida: allow/deny
- Efeito: pode gravar grant persistente
- Erro: input invalido, deny, abort
- Continuacao: execucao da tool
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

7. Execucao da tool
- Arquivo: `src/query.ts`
- Funcao: `tool.call(...)`
- Entrada: args normalizados
- Saida: `progress` e `result`
- Efeito: IO local/remoto conforme tool
- Erro: excecao capturada e convertida em `tool_result` erro
- Continuacao: agrega resultado no historico
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

8. Tratamento do resultado
- Arquivo: `src/utils/messages.tsx`
- Funcao: `normalizeMessagesForAPI`, `reorderMessages`
- Entrada: mensagens completas
- Saida: sequencia reconciliada para proxima chamada
- Efeito: merge de `tool_result` adjacentes
- Erro: inconsistencia de ordenacao mitigada por reorder
- Continuacao: recurse
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

9. Reentrada no loop
- Arquivo: `src/query.ts`
- Funcao: chamada recursiva de `query`
- Entrada: mensagens atualizadas
- Saida: novo turno
- Condicao de parada: ausencia de `tool_use`
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

10. Finalizacao
- Arquivo: `src/query.ts`
- Funcao: retorno sem recurse
- Saida: resposta final ao usuario
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

---

## 4) Shape Real das Mensagens

1. Assistant message
- Arquivos: `src/query.ts`, `src/services/claude.ts`
- Shape: `type='assistant'`, `costUSD`, `durationMs`, `message.content[]`
- Implicacao: envelope carrega metrica e payload de IA no mesmo objeto.
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

2. `tool_use`
- Arquivos: `src/query.ts`, `src/utils/messages.tsx`
- Shape: bloco em `assistant.message.content` com `id`, `name`, `input`
- Implicacao: correlacao depende de `tool_use_id` no retorno.
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

3. `tool_result`
- Arquivos: `src/query.ts`, `src/utils/messages.tsx`
- Shape: `user.message.content[0].type='tool_result'` + `tool_use_id` + `is_error?`
- Implicacao: resultado fica no papel de mensagem de usuario.
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

4. Correlacao e ordenacao
- Arquivo: `src/utils/messages.tsx`
- Funcoes: `getToolUseID`, `reorderMessages`, `normalizeMessagesForAPI`
- Implicacao: runtime reconcilia tool progress/result para coerencia de replay.
- Natureza: EVIDENCIA EXPLICITA | Confianca: ALTA

5. Papel de `messages.tsx`
- Responsabilidade: contrato operacional de conversa, nao apenas render.
- Natureza: INFERENCIA ESTRUTURAL | Confianca: ALTA

---

## 5) Sistema de Tools

Contrato real:
- Definicao: `src/tools.ts` e modulos em `src/tools/**`
- Registro: lista local + `getMCPTools()`
- Descoberta: fixa para locais; dinamica para MCP
- Execucao: `tool.call`, com `result` e `progress`
- Input/output: schema por tool (zod/json schema)
- Erro: convertido em `tool_result` com `is_error`

Contrato inferido:
- Existe interface base `Tool` (importada de `../Tool.js`), mas arquivo nao visivel na arvore `src/**`.
- Natureza: INFERENCIA ESTRUTURAL | Confianca: MEDIA

Fragilidades:
- Registro hibrido local+MCP enfraquece previsibilidade de contrato.
- `dangerouslySkipPermissions` aumenta superficie de risco.

Pontos fortes:
- Pipeline padronizado de validacao/permissao/execucao.
- Separacao clara entre tools read-only e mutantes em varias rotas de decisao.

---

## 6) Camada de Policy / Guard / Permissao

- Arquivo principal: `src/permissions.ts`
- Verificacao: por tool, por comando e por prefixo (bash)
- Classificacao: safe commands + grants persistidos + grants de sessao para escrita
- Bloqueios: deny default quando prefixo falha ou injecao suspeita
- Confirmacao: via `useCanUseTool` + componentes de permissao
- Excecoes: abort e erros convertidos em mensagens seguras

Valor arquitetural:
- Policy e explicita e acionavel, mas orientada a contexto local de CLI.

Fragilidade principal:
- Heuristica de prefixo de comando pode sofrer falsos positivos/negativos.

Natureza: EVIDENCIA EXPLICITA.
Confianca: ALTA.

---

## 7) Prompts e Governanca de Comportamento

- System prompts: `src/constants/prompts.ts` (`getSystemPrompt`, `getAgentPrompt`)
- Prompt por tool: `src/tools/*/prompt.ts`
- Papel principal vs subagente: system prompt principal e prompt especializado de AgentTool
- Impacto real: orienta formato de resposta, uso de tools e limites operacionais
- Cosmetico vs efetivo: prompts de regras operacionais sao efetivos; textos de UX sao cosmeticos

Natureza: EVIDENCIA EXPLICITA.
Confianca: ALTA.

---

## 8) Memoria / Contexto / Persistencia

- Contexto de projeto: `src/context.ts`
- Persistencia de conversa/log: `src/utils/log.ts`
- Contexto em loop: incorporado por `formatSystemPromptWithContext`
- Persistente: logs/config e grants de tools
- Transitorio: estado de UI/progress e abort controllers
- Sidechains/subagentes: AgentTool stateless; MCP clients em cache memoized

Natureza: EVIDENCIA EXPLICITA + INFERENCIA ESTRUTURAL.
Confianca: ALTA.

---

## 9) Telemetria / Logging / Observabilidade

- Local logs: `src/utils/log.ts`
- Eventos de produto: `src/services/statsig.ts`
- Erros: `src/services/sentry.ts`
- Correlacao de sessao: `SESSION_ID` e metadata no client
- Auditoria: focada em produto/execucao CLI, nao em trilha de negocio multi-tenant

Lacuna:
- Observabilidade centrada em runtime CLI, sem trilha nativa de contrato de negocio.

Natureza: EVIDENCIA EXPLICITA.
Confianca: ALTA.

---

## 10) MCP / Extensoes / Runtime Externo

- Entrada externa: `src/services/mcpClient.ts`
- Wrapper: `src/tools/MCPTool/MCPTool.tsx`
- Servidor proprio: `src/entrypoints/mcp.ts`

Riscos de governanca:
- Contratos heterogeneos de tools externas
- Capabilities variaveis por server
- Maior imprevisibilidade operacional

Aproveitavel como conceito:
- Interface de extensao com descoberta de tools/prompts

Nao reproduzir sem guardrails:
- Execucao externa sem action contracts rigidamente versionados
- acoplamento dinamico de contratos em caminhos criticos

Natureza: EVIDENCIA EXPLICITA.
Confianca: ALTA.

---

## 11) O que foi procurado e nao encontrado

1. Arquivo base de contrato `Tool` no `src/**`
- Evidencia: imports para `../Tool.js` sem arquivo correspondente na arvore analisada.
- Natureza: EVIDENCIA EXPLICITA
- Confianca: ALTA

2. Contrato formal de risco por tool (nivel, criticidade)
- Natureza: INFERENCIA ESTRUTURAL
- Confianca: MEDIA

3. Contrato de auditoria de negocio (tenant-aware) no repositorio externo
- Natureza: INFERENCIA ESTRUTURAL
- Confianca: MEDIA

4. Limites de reconstrucao por sourcemap
- Alguns contratos dependem de arquivos nao presentes no recorte de `src/**`.
- Natureza: EVIDENCIA EXPLICITA
- Confianca: ALTA

---

## 12) Top 10 padroes realmente extraidos

| Padrao | Arquivos fonte | Por que e real | Valor arquitetural | Valor operacional | Risco adocao | Esforco | Decisao |
|---|---|---|---|---|---|---|---|
| Loop recurse com tools | `src/query.ts` | recurse explicita | alto | alto | medio | medio | ADAPTAR DEPOIS |
| Reconciliacao de mensagens | `src/utils/messages.tsx` | funcoes dedicadas | alto | alto | baixo | medio | ADOTAR AGORA |
| Gate de permissao por tool | `src/permissions.ts` | deny/allow explicito | alto | alto | baixo | baixo | ADOTAR AGORA |
| Split read-only vs mutation | `src/query.ts`, tools | caminho concorrente/serial | medio | alto | baixo | baixo | ADOTAR AGORA |
| Prompt por ferramenta | `src/tools/*/prompt.ts` | contratos de instrucao | medio | medio | medio | medio | ADAPTAR DEPOIS |
| Retry manual com telemetria | `src/services/claude.ts` | withRetry + eventos | medio | alto | baixo | baixo | ADOTAR AGORA |
| Wrapper MCP dinamico | `src/services/mcpClient.ts` | chamada externa real | medio | medio | alto | alto | BENCHMARK |
| Progress messages no loop | `src/query.ts` | tipo `progress` dedicado | medio | medio | medio | medio | ADAPTAR DEPOIS |
| Persistencia de grants locais | `src/permissions.ts` | savePermission explicito | medio | medio | medio | baixo | BENCHMARK |
| Side-agent stateless | `src/tools/AgentTool/*` | tool dedicada | medio | medio | medio | medio | ADAPTAR DEPOIS |

---

## 13) Comparacao sistematica com TODO o CONDSTORE

| Componente externo | Equivalente CONDSTORE | Arquivos CONDSTORE | Status | CONDSTORE vs externo | Recomendacao |
|---|---|---|---|---|---|
| Agent loop | Orquestrador Frank + WhatsApp orchestrator | `src/core/ai/frank-orchestrator.ts`, `src/modules/frank/whatsapp-orchestrator.ts` | EXISTE | MELHOR em governanca operacional | FORMALIZAR |
| Action contracts | contratos de acao Frank | `src/modules/frank/action-contracts.ts` | EXISTE | MELHOR (tipagem de negocio) | EXPANDIR |
| Action policy | policy read/mutation + mode | `src/modules/frank/action-policy.ts`, `src/modules/frank/tools/tool-guard.ts` | EXISTE | MELHOR (mode-aware) | FORMALIZAR |
| Review/dispatch | rotas internas de propose/approve/execute/reject | `src/app/api/internal/tenants/[tenantId]/actions/**/route.ts` | EXISTE | MELHOR (workflow supervisionado) | EXPANDIR |
| LLM gateway | gateway central multi-provider | `src/core/ai/llm-gateway.ts`, `src/core/ai/provider.interface.ts` | EXISTE | MELHOR (camada de dominio) | FORMALIZAR |
| Prompt registry | registry versionado | `src/core/ai/prompt-registry.ts` | EXISTE | IGUAL/MELHOR | EXPANDIR |
| Session repository | sessao/memoria Frank | `src/modules/frank/session.repository.ts`, `src/modules/frank/memory/memory.service.ts` | EXISTE | MELHOR em contexto de negocio | FORMALIZAR |
| Context builder | context cache + resolver | `src/infra/context-cache.ts` | EXISTE | IGUAL | EXPANDIR |
| Tool registry | enumeracao e guard | `src/modules/frank/tools/tool-guard.ts`, `src/modules/frank/tools/read-only/*` | EXISTE PARCIALMENTE | PIOR (sem registry unico) | FORMALIZAR |
| Telemetry/audit | logger, sentry, audit repo | `src/infra/log/logger.ts`, `src/infra/observability/sentry.ts`, `src/infra/repositories/admin-audit-log.repository.ts` | EXISTE | MELHOR | EXPANDIR |
| Suggestions | fluxo Frank supervisionado | `src/modules/frank/whatsapp-orchestrator.ts` | EXISTE PARCIALMENTE | IGUAL | ADAPTAR |
| Tracking/attribution | token parser/hash/types | `src/infra/attribution/*` | EXISTE | MELHOR (tenant-aware) | EXPANDIR |
| Cockpit/metricas | modulo cockpit e agregadores | `src/modules/cockpit/data/*`, `src/modules/cockpit/rooms/*` | EXISTE | MELHOR (operacional) | EXPANDIR |
| Event repositories | event bus + repos | `src/modules/domine/event-bus.service.ts`, `src/infra/repositories/*events*` | EXISTE | MELHOR | EXPANDIR |
| Integracoes externas | providers e conectores | `src/core/ai/provider.interface.ts`, modulos de integracao | EXISTE PARCIALMENTE | IGUAL | ADAPTAR |
| Auth/multi-tenant/infra | guards e security infra | `src/infra/security/*`, `src/infra/auth/*` | EXISTE | MELHOR | FORMALIZAR |
| MCP nativo | sem implementacao MCP no core produto | nao existe eixo unico | NAO EXISTE | NA | IGNORAR por ora |

---

## 14) Comparacao favoravel ao CONDSTORE

O CONDSTORE ja resolve melhor:
1. Governanca de negocio e trilha de acao supervisionada.
2. Isolamento multi-tenant e controles de auth na arquitetura real de produto.
3. Observabilidade orientada a operacao e auditoria.
4. Acoplamento de IA ao dominio operacional (Frank) sem depender do runtime CLI.

O CONDSTORE nao precisa alterar:
- Estrategia central de action policy supervisionada.
- Separacao entre runtime de IA e contratos de negocio.
- Camada de seguranca tenant-aware.

Seria regressao copiar diretamente do repo externo:
- Modelo de extensibilidade altamente dinamico via MCP em fluxos criticos.
- Semantica de permissao local do CLI como se fosse policy de produto multi-tenant.

---

## 15) Anti-padroes e anti-recomendacoes

1. Runtime excessivamente flexivel em caminho critico de negocio.
2. Dependencia de contratos externos heterogeneos sem versionamento de dominio.
3. Decisao probabilistica para autorizacao de acao mutante.
4. Overengineering de side-agents sem contrato de auditoria empresarial.
5. Reuso de contratos de mensagem de CLI em produto multi-tenant.

Classificacao: `IGNORAR` ou `BENCHMARK NEGATIVO`.
Natureza: EVIDENCIA EXPLICITA + INFERENCIA ESTRUTURAL.
Confianca: ALTA.

---

## 16) Gaps reais do CONDSTORE (visao ampla)

Maduro hoje:
- policy/guard de tools
- prompt registry
- llm gateway
- auditoria e observabilidade
- contexto operacional Frank

Implicito e a formalizar:
- registry unico de tools de Frank
- contrato padrao de correlacao tool request/result
- taxonomia de risco de tools para governanca uniforme

Falta estrutural (nao bloqueante):
- camada de extensibilidade externa formalizada (MCP-like) desacoplada e segura

Expandir fora do MVP:
- contratos de observabilidade por etapa do loop
- registry/versionamento de tools e capabilities

Esperar maturidade:
- runtime de extensoes externas em superfices frozen

Natureza: INFERENCIA ESTRUTURAL.
Confianca: MEDIA.

---

## 17) Backlog executavel (12 PRs)

| PR | Objetivo | Arquivos exatos | Mudanca especifica | Valor | Risco | Dependencias | Criterio de aceite | Horizonte |
|---|---|---|---|---|---|---|---|---|
| PR-01 Formalizar Tool Registry Frank | centralizar metadata de tools | `src/modules/frank/tools/tool-guard.ts`, `src/modules/frank/tools/read-only/*`, `src/modules/frank/whatsapp-orchestrator.ts` | extrair mapa unico de tool metadata e access | alto | medio | nenhuma | todas tools resolvidas via registry unico | AGORA |
| PR-02 Contrato Tool Request/Result | padronizar correlacao | `src/core/ai/frank-orchestrator.ts`, `src/modules/frank/whatsapp-orchestrator.ts` | introduzir id correlacionavel e envelope tipado | alto | medio | PR-01 | logs mostram correlation id em toda execucao | AGORA |
| PR-03 Taxonomia de risco por tool | governanca de risco | `src/modules/frank/tools/tool-guard.ts`, `src/modules/frank/action-policy.ts` | classificar `low/medium/high` por acao | alto | baixo | PR-01 | policy usa risco para gate/review | CURTO PRAZO |
| PR-04 Observabilidade por etapa do loop | melhorar forense | `src/modules/frank/whatsapp-orchestrator.ts`, `src/infra/log/logger.ts` | eventos padronizados por etapa | alto | baixo | nenhuma | dashboard/logs permitem replay por etapa | CURTO PRAZO |
| PR-05 Prompt Governance Hardening | aumentar previsibilidade | `src/core/ai/prompt-registry.ts`, `src/core/ai/llm-gateway.ts` | adicionar metadados de politica por prompt | medio | baixo | nenhuma | prompt ativo valida metadados minimos | CURTO PRAZO |
| PR-06 Session Context Contract | formalizar contexto de sessao | `src/infra/context-cache.ts`, `src/modules/frank/memory/memory.service.ts` | schema unico de contexto operativo | medio | medio | PR-02 | contexto validado e versionado | CURTO PRAZO |
| PR-07 Action Dispatch Audit Bridge | ligar action-policy ao audit | `src/modules/frank/action-policy.ts`, `src/infra/repositories/admin-audit-log.repository.ts` | registrar transicoes de acao em audit unificado | alto | baixo | nenhuma | propose/approve/execute/reject auditados | AGORA |
| PR-08 Tool Contract Tests | reduzir regressao | `src/modules/frank/tools/*.test.ts`, `src/modules/frank/tools/read-only/*.test.ts` | cobertura de contrato de input/output/acesso | alto | baixo | PR-01 | testes cobrindo happy path e deny path | AGORA |
| PR-09 Cockpit Signal Normalization | alinhar metricas agenticas | `src/modules/cockpit/data/get-cockpit-events.ts`, `src/modules/cockpit/data/get-cockpit-metrics.ts` | normalizar eventos de agent loop para cockpit | medio | medio | PR-04 | eventos aparecem em metricas operacionais | MEDIO PRAZO |
| PR-10 Tracking-Action Link | fechar funil de acao | `src/infra/attribution/attribution.types.ts`, `src/modules/domine/event-bus.service.ts` | correlacionar evento de acao com attribution | medio | medio | PR-02 | event id de acao presente em tracking | MEDIO PRAZO |
| PR-11 Security Guard Coverage | reforcar rotas sensiveis | `src/infra/security/*`, `src/app/api/internal/tenants/[tenantId]/actions/**/route.ts` | ampliar testes de guard e tenant match | alto | baixo | nenhuma | 100% rotas internas de action com guard testado | AGORA |
| PR-12 External Extension RFC | definir fronteira de extensao | `ARCHITECTURE.md`, `docs/architecture/*` | RFC de extensibilidade segura (sem implementar MCP) | medio | baixo | PR-01 a PR-03 | RFC aprovada com contratos e limites | LONGO PRAZO |

---

## 18) Priorizacao por Horizonte

AGORA:
- PR-01, PR-02, PR-07, PR-08, PR-11
- Motivo: reduzem risco de governanca e aumentam auditabilidade imediata.

CURTO PRAZO:
- PR-03, PR-04, PR-05, PR-06
- Motivo: consolidacao de contratos e padroes.

MEDIO PRAZO:
- PR-09, PR-10
- Motivo: integra sinais ao cockpit e attribution em escala.

LONGO PRAZO:
- PR-12
- Motivo: extensibilidade externa exige maturidade arquitetural e politica.

---

## 19) Matriz Final de Decisao

| Item | Tipo | Valor | Risco | Esforco | Confianca | Prioridade | Recomendacao final |
|---|---|---|---|---|---|---|---|
| Registry unico de tools Frank | arquitetural | alto | medio | medio | ALTA | alta | FORMALIZAR |
| Correlacao tipada tool request/result | arquitetural | alto | medio | medio | ALTA | alta | FORMALIZAR |
| Taxonomia de risco de acao | operacional | alto | baixo | baixo | ALTA | alta | EXPANDIR |
| MCP dinamico em fluxo critico | anti-padrao | baixo | alto | alto | ALTA | baixa | IGNORAR |
| Prompt metadata governance | arquitetural | medio | baixo | medio | MEDIA | media | ADAPTAR |
| Observabilidade por etapa | operacional | alto | baixo | baixo | ALTA | alta | EXPANDIR |
| Side-agent generico amplo | benchmark | medio | medio | medio | MEDIA | media | BENCHMARK |
| Reuso direto de policy CLI | anti-padrao | baixo | alto | baixo | ALTA | alta | IGNORAR |

---

## 20) Ranking Final de Confianca

### Descobertas com confianca ALTA

1. Loop real externo e recursivo com parse de `tool_use` e reentrada.
- Evidencia: `src/query.ts`.
- Orientacao: valida formalizacao de contratos de reentrada no CONDSTORE.

2. `messages.tsx` e peca estrutural de contrato, nao apenas UI.
- Evidencia: `normalizeMessagesForAPI`, `reorderMessages`, `getToolUseID`.
- Orientacao: reforca necessidade de contrato equivalente explicito no CONDSTORE.

3. Policy externa e local-first; nao equivale a governanca de produto multi-tenant.
- Evidencia: `src/permissions.ts`.
- Orientacao: evitar copiar policy de CLI para runtime de negocio.

4. MCP externo e poderoso, mas com risco de previsibilidade/governanca.
- Evidencia: `src/services/mcpClient.ts`, `src/entrypoints/mcp.ts`.
- Orientacao: usar so como benchmark arquitetural.

5. CONDSTORE ja supera em governanca, auditoria e tenant isolation.
- Evidencia: `src/modules/frank/action-policy.ts`, `src/infra/repositories/admin-audit-log.repository.ts`, `src/infra/security/*`.
- Orientacao: preservar arquitetura atual e formalizar lacunas pontuais.

### Descobertas com confianca MEDIA

1. Ausencia de `Tool` base no recorte `src/**` limita reconstrucao total do contrato.
- Evidencia: imports para `../Tool.js`.
- Cautela: tratar inferencias de assinatura como nao definitivas.

2. Necessidade de extensibilidade externa futura (MCP-like) no CONDSTORE.
- Evidencia: lacuna funcional vs benchmark.
- Cautela: priorizar RFC e guardrails antes de implementar.

### Descobertas com confianca BAIXA

1. Beneficio liquido de side-agents genericos fora do contexto atual do Frank.
- Limitacao: sem prova de ganho operacional no contexto do CONDSTORE.
- Recomendacao: nao guiar implementacao direta.

2. Portabilidade direta de heuristicas de permissao bash.
- Limitacao: modelo de risco difere do dominio de negocio.
- Recomendacao: usar apenas como referencia de UX, nao de policy.

---

## Decisao Final

- `ADOTAR AGORA`: formalizacao de contracts internos (tools, correlacao, auditoria, testes).
- `ADAPTAR DEPOIS`: padroes de observabilidade e metadata de prompt.
- `IGNORAR`: copia direta de runtime MCP dinamico e policy de CLI em fluxo de negocio.
- `BENCHMARK`: ideias de extensibilidade e side-agent, sem transplante literal.

Conclusao objetiva:
- O repositorio externo e excelente benchmark de runtime agentico CLI.
- O CONDSTORE, como ecossistema multi-tenant operacional/comercial, ja e superior em governanca, seguranca e consistencia de produto.
- A evolucao recomendada e de formalizacao e escalabilidade interna, nao de substituicao arquitetural.