# Analise Forense de Arquitetura e Codigo

## `leeyeel/claude-code-sourcemap`

Documento consolidado final, baseado em evidencia de codigo, para uso de decisao arquitetural no CONDSTORE.

- Repositorio analisado: `leeyeel/claude-code-sourcemap`
- Commit analisado: `577611a7b32580b5a2e09ff130edfd7709ff11a1`
- Repositorio de referencia para traducao: `catcaio/projeto-condstore`
- Data da analise: `2026-04-01`

Atualizacao de consolidacao (escopo ecossistema completo):

- Documento definitivo: `docs/benchmarks/condstore-ecosystem-vs-claude-sourcemap-definitivo.md`
- Objetivo desta versao: preservar trilha forense original e servir como base historica complementar.

---

## 1. Escopo, metodo e limites

### Metodo executado

A analise foi executada em fases:

1. varredura do repositorio
2. selecao dos arquivos criticos
3. analise profunda desses arquivos
4. reconstrucao da arquitetura
5. traducao para o CONDSTORE
6. geracao de backlog executavel

### O que foi considerado arquitetura util

Foi tratado como arquitetura util, prioritariamente:

- `src/**`
- entrypoints
- loop de execucao
- registry de tools
- policy / permission
- contexto e memoria
- telemetria
- prompts operacionais

### O que foi explicitamente desconsiderado

- `vendor/**`
- `cli.mjs`
- `yoga.wasm`
- artefatos empacotados sem valor arquitetural direto

### Limite estrutural da analise

O repositorio analisado e reconstruido por sourcemap. Isso reduz a confianca em partes do contrato interno, principalmente onde o codigo aponta para arquivos que nao aparecem em `src/**`.

Exemplo critico:

- varios modulos importam `../Tool.js`
- o arquivo correspondente ao contrato `Tool` nao aparece em `src/**`

Implicacao:

- o contrato operacional de tool pode ser reconstruido com boa base estrutural
- a assinatura exata do tipo nao pode ser verificada integralmente

---

## 2. Visao geral consolidada da arquitetura

O sistema analisado e um runtime CLI orientado a mensagens, tools e recurse. O caminho principal e:

1. bootstrap do processo
2. carregamento de tools locais e tools MCP
3. captura de input
4. montagem de prompt + contexto
5. chamada ao modelo
6. extracao de `tool_use`
7. execucao de tools com validacao e policy
8. geracao de `tool_result`
9. reenvio do historico ao loop
10. finalizacao quando nao ha mais `tool_use`

O eixo arquitetural central nao esta no terminal em si. Esta na combinacao entre:

- `src/query.ts`
- `src/utils/messages.tsx`
- `src/services/claude.ts`

Esse trio define:

- contrato de mensagens
- ciclo de execucao
- contrato de integracao com o modelo

---

## 3. Arquivos criticos finais

| Arquivo | Funcao real | Por que importa | Confianca |
|---|---|---|---|
| `src/entrypoints/cli.tsx` | bootstrap, trust dialog, load de tools e MCP, escolha de REPL/ask | ponto de entrada | ALTA |
| `src/screens/REPL.tsx` | estado interativo, `onInit`, `onQuery`, dialogs, replay visual | orquestracao de sessao | ALTA |
| `src/query.ts` | loop principal, concorrencia, execucao, recurse | nucleo do runtime | ALTA |
| `src/services/claude.ts` | adapter de modelo, retry, caching, serializacao para API | camada LLM | ALTA |
| `src/utils/messages.tsx` | constructors, normalizacao, reorder, merge para API, slash commands | contrato de mensagens | ALTA |
| `src/tools.ts` | registry de tools locais + MCP | capability set | ALTA |
| `src/permissions.ts` | decisao de permissao | policy central | ALTA |
| `src/utils/permissions/filesystem.ts` | grants de FS por sessao | guard de filesystem | ALTA |
| `src/hooks/useCanUseTool.ts` | mediacao entre policy e UI | confirmacao operacional | ALTA |
| `src/components/permissions/PermissionRequest.tsx` | roteamento do prompt de permissao | UI de governanca | ALTA |
| `src/services/mcpClient.ts` | carregamento de clientes MCP, wrapping de tools e prompts | runtime de extensao | ALTA |
| `src/entrypoints/mcp.ts` | servidor MCP embutido | superficie de integracao | ALTA |
| `src/context.ts` | snapshot de contexto, git, README, estrutura de diretorio | memoria persistente de sessao | ALTA |
| `src/constants/prompts.ts` | prompt global e prompt de side-agent | governanca via instrucao | ALTA |
| `src/tools/BashTool/BashTool.tsx` | tool mutante, shell persistente, validacao de comando | maior risco operacional | ALTA |
| `src/tools/FileReadTool/FileReadTool.tsx` | leitura, limites, timestamps | tool read-only canonica | ALTA |
| `src/tools/FileEditTool/FileEditTool.tsx` | edicao incremental, stale-read guard | seguranca de mutacao | ALTA |
| `src/tools/FileWriteTool/FileWriteTool.tsx` | escrita total, stale-read guard | seguranca de mutacao | ALTA |
| `src/tools/AgentTool/AgentTool.tsx` | side-agent stateless | recurse auxiliar | ALTA |
| `src/tools/MCPTool/MCPTool.tsx` | wrapper generico de tools MCP | benchmark negativo de governanca | ALTA |
| `src/utils/commands.ts` | prefix detection e injection detection de bash via modelo | ponto critico de fragilidade | ALTA |
| `src/utils/log.ts` | transcricoes e logs de erro | replay e observabilidade | ALTA |

---

## 4. Shape real das mensagens

## 4.1 Outer envelope de runtime

Arquivo base:

- `src/query.ts`

Tipos operacionais:

- `UserMessage`
- `AssistantMessage`
- `ProgressMessage`
- `Message = UserMessage | AssistantMessage | ProgressMessage`

### `UserMessage`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Forma real:

```ts
{
  type: 'user',
  message: {
    role: 'user',
    content: string | ContentBlockParam[]
  },
  uuid,
  toolUseResult?
}
```

Responsabilidade:

- representar input humano
- representar `tool_result`
- representar injecoes de slash commands do tipo `prompt`

Campos centrais:

- `type`
- `message.role`
- `message.content`
- `toolUseResult?`

Confianca:

- ALTA para shape geral
- MEDIA para semantica exata de alguns caminhos de `prompt` MCP

### `AssistantMessage`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`
- `src/services/claude.ts`

Forma real:

```ts
{
  type: 'assistant',
  costUSD,
  durationMs,
  uuid,
  isApiErrorMessage?,
  message: {
    id,
    model,
    role: 'assistant',
    stop_reason,
    stop_sequence,
    type: 'message',
    usage,
    content: ContentBlock[]
  }
}
```

Responsabilidade:

- carregar a resposta do modelo
- carregar mensagens sinteticas do runtime
- carregar blocos `tool_use`

Campos centrais:

- `message.id`
- `message.content[]`
- `message.stop_reason`
- `isApiErrorMessage`

Confianca:

- ALTA

### `ProgressMessage`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Forma real:

```ts
{
  type: 'progress',
  toolUseID,
  siblingToolUseIDs,
  content: AssistantMessage,
  normalizedMessages,
  tools,
  uuid
}
```

Responsabilidade:

- existir apenas para UI
- mostrar tool em andamento
- nao ser reenviado a API

Confianca:

- ALTA

## 4.2 Shape real de `tool_use`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Origem:

- `assistantMessage.message.content.filter(_ => _.type === 'tool_use')`

Campos centrais observados:

- `type: 'tool_use'`
- `id`
- `name`
- `input`

Uso real dos campos:

- `id`: correlacao com `tool_result`
- `name`: selecao da tool concreta
- `input`: payload executavel

Confianca:

- ALTA

## 4.3 Shape real de `tool_result`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Forma real emitida pelo loop:

```ts
{
  type: 'tool_result',
  content,
  tool_use_id,
  is_error?
}
```

Onde nasce:

- `createToolResultStopMessage`
- `checkPermissionsAndCallTool`

Casos reais de emissao:

- cancelamento
- schema invalido
- validacao semantica invalida
- permissao negada
- sucesso da tool
- erro de execucao da tool

Campo central:

- `tool_use_id`

Confianca:

- ALTA

## 4.4 Como os blocos sao ordenados e reconciliados

### Reordenacao visual

Arquivo:

- `src/utils/messages.tsx`

Funcao:

- `reorderMessages`

Comportamento:

- mantem uma lista de `toolUseMessages` ja vistos
- se receber `progress`, tenta posicionar logo apos o `tool_use`
- se receber `tool_result`, tenta posicionar apos `progress`, ou apos `tool_use` se nao houver `progress`

Responsabilidade:

- timeline correta para UI
- nao governa o payload enviado ao modelo

Confianca:

- ALTA

### Reenvio para o loop

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Funcoes:

- `query`
- `normalizeMessagesForAPI`

Comportamento:

- `query` acumula `toolResults`
- `normalizeMessagesForAPI` remove `progress`
- `normalizeMessagesForAPI` junta `tool_result` consecutivos em um unico `UserMessage`
- o proximo `query()` recebe o historico consolidado

Responsabilidade:

- serializar o historico em um formato aceitavel pela API
- preservar o acoplamento de multiplos `tool_result` de um mesmo turno

Confianca:

- ALTA

## 4.5 Papel de `src/utils/messages.tsx`

Esse arquivo nao e utilitario periferico. Ele e uma peca de contrato.

Ele define:

- mensagens sinteticas
- constructors
- entrada de usuario
- slash commands
- normalizacao para render
- normalizacao para API
- vinculo `tool_use <-> tool_result`
- resolucao de tool em andamento, tool com erro e tool pendente

Implicacao arquitetural:

- qualquer porte do loop para outro produto precisa portar tambem esse contrato
- portar apenas `query.ts` sem portar a semantica de `messages.tsx` gera inconsistencias

Confianca:

- ALTA

---

## 5. Aprofundamento real de `src/query.ts`

## 5.1 Funcoes que compoem o loop

| Funcao | Papel operacional | Entrada | Saida | Confianca |
|---|---|---|---|---|
| `queryWithBinaryFeedback` | faz 1 ou 2 chamadas ao modelo e escolhe resposta | context, callback de resposta, callback de comparacao | `BinaryFeedbackResult` | ALTA |
| `query` | loop principal recursivo | historico, prompt, contexto, policy, tools | `AsyncGenerator<Message>` | ALTA |
| `runToolsConcurrently` | dispara tools read-only em paralelo | lista de `tool_use` | stream de mensagens | ALTA |
| `runToolsSerially` | dispara tools mutantes em sequencia | lista de `tool_use` | stream de mensagens | ALTA |
| `runToolUse` | resolve tool concreta e chama pipeline interno | `ToolUseBlock` | stream de mensagens | ALTA |
| `normalizeToolInput` | normaliza input antes de permissoes | tool + input | input normalizado | ALTA |
| `checkPermissionsAndCallTool` | pipeline de pre-execucao e execucao | tool + payload + contexto | `UserMessage` ou `ProgressMessage` | ALTA |
| `formatError` | serializa erro para `tool_result` | `unknown` | `string` | ALTA |

## 5.2 Fluxo detalhado do loop

### Etapa 1: montagem do prompt final

Arquivo:

- `src/query.ts`

Funcao:

- `query`

Comportamento:

- chama `formatSystemPromptWithContext(systemPrompt, context)`
- produz `fullSystemPrompt`

Saida:

- array de strings do prompt final

Confianca:

- ALTA

### Etapa 2: chamada ao modelo

Arquivo:

- `src/query.ts`

Funcao:

- `query`

Comportamento:

- cria `getAssistantResponse()`
- chama `querySonnet(normalizeMessagesForAPI(messages), fullSystemPrompt, ...)`

Entrada:

- historico ja normalizado para API

Saida:

- `AssistantMessage`

Confianca:

- ALTA

### Etapa 3: binary feedback opcional

Arquivo:

- `src/query.ts`

Funcao:

- `queryWithBinaryFeedback`

Comportamento:

- se `USER_TYPE !== 'ant'`, retorna resposta unica
- se binario estiver ativo, chama duas respostas em paralelo
- usa `getBinaryFeedbackResponse` para escolher uma
- pode marcar `shouldSkipPermissionCheck`

Confianca:

- ALTA

### Etapa 4: extracao de `tool_use`

Arquivo:

- `src/query.ts`

Funcao:

- `query`

Comportamento:

- filtra `assistantMessage.message.content` por `type === 'tool_use'`
- nao confia em `stop_reason === 'tool_use'`

Implicacao:

- o contrato operacional real depende dos blocos, nao do stop reason

Confianca:

- ALTA

### Etapa 5: decisao de concorrencia

Arquivo:

- `src/query.ts`

Funcao:

- `query`

Comportamento:

- se todas as tools do turno forem `isReadOnly()`, usa `runToolsConcurrently`
- caso contrario, usa `runToolsSerially`

Heuristica:

- read-only = concorrente
- qualquer mutacao potencial = serial

Confianca:

- ALTA

### Etapa 6: validacao e permissao

Arquivo:

- `src/query.ts`

Funcao:

- `checkPermissionsAndCallTool`

Ordem real:

1. `tool.inputSchema.safeParse(input)`
2. `normalizeToolInput(tool, input)`
3. `tool.validateInput?.(...)`
4. `canUseTool(...)`
5. `tool.call(...)`

Essa ordem e importante:

- nao pede permissao antes de saber se o payload e invalido
- nao executa antes da validacao semantica

Confianca:

- ALTA

### Etapa 7: transformacao de resultado em mensagem

Arquivo:

- `src/query.ts`

Funcao:

- `checkPermissionsAndCallTool`

Comportamento:

- `result.type === 'result'` vira `createUserMessage([{ type:'tool_result', ... }], { data, resultForAssistant })`
- `result.type === 'progress'` vira `createProgressMessage(...)`

Implicacao:

- a tool nao escreve diretamente no historico
- quem transforma saida em contrato de mensagem e o loop

Confianca:

- ALTA

### Etapa 8: recurse

Arquivo:

- `src/query.ts`

Funcao:

- `query`

Comportamento:

- apos coletar `toolResults`, chama recurse com:

```ts
yield* await query(
  [...messages, assistantMessage, ...orderedToolResults],
  ...
)
```

Implicacao:

- o estado do loop e o proprio historico
- nao existe state machine separada do historico

Confianca:

- ALTA

## 5.3 Quais erros encerram o fluxo e quais sao absorvidos

### Erros absorvidos e convertidos em `tool_result`

- input invalido
- validacao semantica falha
- permissao negada
- excecao em `tool.call`

Evidencia:

- `checkPermissionsAndCallTool`

Confianca:

- ALTA

### Erros absorvidos e convertidos em `AssistantMessage`

- erros de API em `querySonnet`

Evidencia:

- `getAssistantMessageFromError`

Confianca:

- ALTA

### Erros que podem vazar como fluxo incompleto

- `runToolUse` possui `try/catch` externo que apenas chama `logError(e)` e nao garante `tool_result` de fallback

Evidencia:

- `runToolUse`

Implicacao:

- um erro fora do bloco interno de `checkPermissionsAndCallTool` pode deixar a iteracao sem fechamento explicito

Confianca:

- ALTA

## 5.4 Achado forense importante

O sorting final de `toolResults` parece usar o campo errado.

Evidencia:

- em `query`, o comparator usa:
  - `tu.id === (a.message.content[0] as ToolUseBlock).id`
- mas `tool_result` usa `tool_use_id`, nao `id`

Arquivos:

- `src/query.ts`
- `src/utils/messages.tsx`

Classificacao:

- existencia do mismatch: ALTA
- impacto comportamental exato: MEDIA

Uso para decisao:

- sim, como indicio forte de que o contrato interno de mensagens e fragil e precisa ser explicitado em qualquer porte para o CONDSTORE

---

## 6. Aprofundamento real de `src/services/claude.ts`

## 6.1 Papel arquitetural real

Esse arquivo nao e apenas um client SDK.

Ele concentra:

- escolha do provider
- retry policy
- serializacao do historico para API
- prompt caching
- custos
- traducao de erro da API para o contrato do runtime
- serializacao de tools para o formato aceito pelo modelo

## 6.2 Quando usa `querySonnet`

Usos observados:

- loop principal em `src/query.ts`
- resumo de historico em `src/commands/compact.ts`

Conclusao:

- `querySonnet` e o caminho do trabalho principal
- `querySonnet` e o path que recebe tools

Confianca:

- ALTA

## 6.3 Quando usa `queryHaiku`

Usos observados:

- gerar descricao curta de comando bash
- extrair file paths a partir de comando + output
- inferir prefixo de comando e detectar injection
- decidir titulo curto da conversa
- escolher arquivos frequentes para exemplos

Conclusao:

- `queryHaiku` e usado como motor auxiliar de heuristica
- nao e o path principal do agent loop

Confianca:

- ALTA

## 6.4 Como retries funcionam

Funcoes:

- `shouldRetry`
- `getRetryDelay`
- `withRetry`

Logica real:

- retry em `APIConnectionError`
- retry em `408`, `409`, `429`, `5xx`
- obedece `x-should-retry` quando presente
- usa `retry-after` quando presente
- backoff exponencial de `500ms` ate `32s`
- em `SWE_BENCH`, tolera mais retries

Valor arquitetural:

- alto

Detalhe local do produto analisado:

- `SWE_BENCH`
- logging detalhado para Statsig

Irrelevante para o CONDSTORE agora:

- tuning de retry por benchmark

## 6.5 Como prompt caching entra no fluxo

Pontos principais:

- system prompt e quebrado em blocos por `splitSysPromptPrefix`
- blocos podem ganhar `cache_control: ephemeral`
- `addCacheBreakpoints(messages)` adiciona cache aos ultimos itens do historico
- `assistantMessageToMessageParam` evita cache em blocos `thinking`

O que isso significa arquiteturalmente:

- o runtime distingue contexto estavel de historico recente
- o caching foi tratado como parte da serializacao de mensagem, nao como concern externo

O que isso NAO vale trazer para o CONDSTORE agora:

- micro-otimizacao de cache por bloco
- coupling de cache a forma especifica do provider atual

## 6.6 Valor arquitetural vs detalhe local

### Valor arquitetural

- adapter unico de modelo
- serializacao uniforme de mensagens
- retry policy explicita
- erro da API convertido para contrato do runtime
- serializacao de tools via prompt + schema

### Detalhe local do produto analisado

- Statsig
- VCR
- singleton global do client
- Bedrock / Vertex / 1P switch
- custo por milhao de tokens

### Irrelevante para o CONDSTORE agora

- binary feedback
- `MAIN_QUERY_TEMPERATURE = 1`
- caching fino por bloco
- heuristicas de terminal/title/example files

---

## 7. Aprofundamento real de `src/utils/messages.tsx`

## 7.1 Papel estrutural

Esse arquivo implementa o contrato de execucao local.

Ele responde por:

- criacao de mensagens sinteticas
- parsing de input
- slash commands
- split em mensagens normalizadas
- reorder de timeline
- merge para API
- correlacao de tool

## 7.2 Normalizacao de mensagens

Funcao:

- `normalizeMessages`

Comportamento:

- `progress` passa como esta
- conteudo string passa como esta
- assistant multi-block vira multiplas mensagens de um bloco
- user array-content cai em um caminho comentado como potencialmente problematico

Implicacao:

- a UI trabalha com uma visao de um bloco por mensagem

Confianca:

- ALTA para o comportamento
- MEDIA para a correcao pretendida do ramo `user`

## 7.3 Reorder / reconciliacao

Funcao:

- `reorderMessages`

Comportamento:

- mantem lista de `toolUseMessages`
- substitui `progress` anterior do mesmo tool por `progress` mais recente
- insere `progress` logo apos `tool_use`
- insere `tool_result` apos `progress`, ou apos `tool_use` se nao houver `progress`

Ensino arquitetural:

- timeline de execucao precisa de reconciliacao explicita
- isso e diferente de persistir o historico bruto

Confianca:

- ALTA

## 7.4 Slash commands

Funcoes:

- `processUserInput`
- `getMessagesForSlashCommand`

Tipos de command:

- `prompt`
- `local`
- `local-jsx`

Contrato real:

- `prompt` injeta `MessageParam[]` no historico
- `local` executa localmente e devolve `assistant`
- `local-jsx` abre interface temporaria e depois devolve `assistant`

Implicacao:

- comandos podem mexer no historico sem passar pelo mesmo caminho do usuario comum

Confianca:

- ALTA

## 7.5 Vinculo entre `tool_use` e `tool_result`

Funcoes:

- `getToolUseID`
- `getUnresolvedToolUseIDs`
- `getInProgressToolUseIDs`
- `getErroredToolUseMessages`

Chave real:

- `tool_use.id`
- `tool_result.tool_use_id`

Uso:

- resolver tool pendente
- resolver tool em andamento
- resolver tool com erro
- animar/renderizar corretamente na UI

Confianca:

- ALTA

## 7.6 O que isso ensina sobre contrato de execucao

Licoes reais:

- nao basta um array linear de eventos
- e preciso distinguir:
  - mensagem persistivel
  - mensagem transitoria
  - bloco de tool
  - correlacao entre bloco de ida e bloco de volta
- a proxima iteracao do loop depende de um payload consolidado, nao da timeline renderizada

Traducao para o CONDSTORE:

- o Frank precisa de um artefato de turno com correlacao explicita
- a UI do cockpit nao deve ser a fonte da semantica operacional

---

## 8. Arquitetura de prompts com profundidade

## 8.1 `getSystemPrompt`

Arquivo:

- `src/constants/prompts.ts`

O que realmente impoe:

- politica anti-malware
- necessidade de verificar convencoes locais
- necessidade de usar search antes de editar
- necessidade de rodar testes/lint/typecheck
- proibicao de commit sem pedido
- limites de proatividade
- uso de `CLAUDE.md` como memoria
- resposta extremamente concisa por ser CLI

Instrucoes centrais:

- seguranca
- convencao local
- verificacao
- disciplina de tool usage
- disciplina de commit

Instrucoes mais cosmeticas:

- framing de produto
- exemplos de respostas curtas
- texto de help / feedback

## 8.2 `getAgentPrompt`

Arquivo:

- `src/constants/prompts.ts`

Mudancas principais:

- reduz o framing
- mantem concisao
- exige paths absolutos
- nao adiciona capacidade nova por si so

Conclusao:

- o papel real do side-agent nao e dado por `getAgentPrompt`
- e dado por `src/tools/AgentTool/prompt.ts`

## 8.3 Prompts por tool que realmente alteram comportamento

### Bash

Arquivo:

- `src/tools/BashTool/prompt.ts`

Impactos reais:

- empurra search para tools especificas, nao para bash
- empurra read para tools especificas, nao para shell
- reforca shell persistente
- codifica fluxo de commit e PR

Conclusao:

- esse prompt e uma policy operacional, nao uma mera descricao

### FileEdit

Arquivo:

- `src/tools/FileEditTool/prompt.ts`

Impactos reais:

- leitura antes da edicao
- exigencia de `old_string` unico
- preferencia por multiplos edits no mesmo turno

Conclusao:

- espelha e reforca o `validateInput`

### FileWrite

Arquivo:

- `src/tools/FileWriteTool/prompt.ts`

Impacto:

- leitura antes de overwrite
- verificacao de diretorio na criacao

### FileRead

Arquivo:

- `src/tools/FileReadTool/prompt.ts`

Impacto:

- mais descritivo do que normativo

### Agent

Arquivo:

- `src/tools/AgentTool/prompt.ts`

Impactos reais:

- side-agent stateless
- sem recursao
- concorrencia incentivada
- em modo normal, side-agent sem bash/write

## 8.4 Traducao para governanca do Frank

No CONDSTORE, a licao correta nao e centralizar governanca em prompt.

A traducao correta e:

- prompt global curto
- contratos e policies em codigo
- instrucoes especificas perto de cada action/tool
- revisao manual no servidor

Evidencia local de que isso ja existe:

- `src/modules/frank/action-contracts.ts`
- `src/modules/frank/action-policy.ts`
- `src/modules/frank/actions/review.ts`
- `src/modules/frank/tools/tool-guard.ts`

---

## 9. Policy / guard consolidado

Pontos ja solidos da analise anterior, mantidos aqui como baseline:

- `src/permissions.ts` centraliza permissao
- `src/utils/permissions/filesystem.ts` guarda grants read/write em memoria
- `src/tools/BashTool/BashTool.tsx` bloqueia comandos banidos e `cd` fora do cwd original
- `src/tools/FileEditTool/FileEditTool.tsx` e `src/tools/FileWriteTool/FileWriteTool.tsx` exigem leitura previa e rejeitam stale write
- `src/hooks/useCanUseTool.ts` conecta policy com UI de aprovacao

Conclusao:

- o repo analisado usa forte governanca local
- mas essa governanca e centrada em CLI e sessao, nao em dominio de negocio

---

## 10. Memoria / contexto consolidado

Pontos mantidos:

- `src/context.ts` compoe snapshot persistente da sessao
- `src/utils/log.ts` persiste logs e sidechains
- `src/screens/REPL.tsx` carrega estado transitorio

Conclusao:

- contexto persistente e estado transitorio sao separados
- essa separacao e util para o CONDSTORE
- o que nao e util e portar o formato CLI cru

---

## 11. Telemetria consolidada

Pontos mantidos:

- `src/utils/log.ts` registra transcricoes
- `src/services/statsig.ts` registra eventos de produto
- `src/services/sentry.ts` captura excecoes com contexto

Licao util para o CONDSTORE:

- unificar correlacao entre decisao, sugestao, review e execucao

---

## 12. Benchmark negativo do MCP / runtime de extensao

## 12.1 Fragilidades reais de governanca

### 1. Wrapper generico demais

Arquivo:

- `src/tools/MCPTool/MCPTool.tsx`

Problemas:

- `isReadOnly() === false` por padrao
- `needsPermissions() === true` sem granularidade por capability
- `inputSchema` permissivo com `passthrough`

Conclusao:

- o wrapper perde semantica fina da tool remota

Confianca:

- ALTA

### 2. Aprovacao por servidor, nao por capability

Arquivo:

- `src/services/mcpClient.ts`

Problema:

- a aprovacao de `.mcprc` ocorre por servidor
- depois disso, `tools/list` inteiro pode ser exposto

Conclusao:

- governanca fraca para ambiente operacional

Confianca:

- ALTA

### 3. Commands remotos injetam mensagens

Arquivos:

- `src/services/mcpClient.ts`
- `src/utils/messages.tsx`

Problema:

- `runCommand()` devolve `MessageParam[]`
- o caminho `prompt` aceita essas mensagens no historico

Conclusao:

- o runtime permite que um prompt remoto participe do historico do modelo

Confianca:

- ALTA

## 12.2 O que pode ser aproveitado so como ideia

- namespacing por origem
- precedencia de configuracao `global / project / mcprc`
- separacao entre tools e prompt-commands externos

## 12.3 O que nao deve entrar no CONDSTORE

- tool externa arbitraria no mesmo caminho do core do Frank
- aprovacao blanket por servidor
- perda do `read_only` vs `mutation`
- prompt remoto influenciando diretamente o loop operacional
- qualquer runtime de extensao no MVP supervisionado

Decisao:

- IGNORAR no MVP

---

## 13. O que foi procurado e nao encontrado

| Item | Resultado | Implicacao | Confianca |
|---|---|---|---|
| contrato fonte de `Tool` | nao encontrado em `src/**` | interface precisou ser inferida | ALTA |
| consumidor de `toolUseResult` | nao encontrado | metadata aparentemente orfa | ALTA |
| contrato unico de mensagens | nao existe; esta distribuido | maior acoplamento implicito | ALTA |
| semantica inequivoca do ramo `user` em `normalizeMessages` | comentario reconhece duvida | parte do contrato e fragil | ALTA |
| prova de correcao do sort final de `toolResults` | nao encontrada | ha indicio de bug de correlacao | ALTA |
| fonte original alem do sourcemap | nao disponivel | baixa confianca em pontos ausentes | ALTA |

---

## 14. Ranking final de confianca

## 14.1 Descobertas com confianca ALTA

| Item | Evidencia | Motivo da classificacao | Pode basear decisao? |
|---|---|---|---|
| loop recursivo principal | `src/query.ts::query` | explicito no codigo | Sim |
| pipeline `schema -> validate -> permission -> call` | `src/query.ts::checkPermissionsAndCallTool` | explicito | Sim |
| separacao entre timeline visual e payload reenviado | `src/utils/messages.tsx::reorderMessages`, `normalizeMessagesForAPI` | explicito | Sim |
| uso de Sonnet no loop e Haiku em heuristicas | `src/query.ts`, `src/services/claude.ts`, usos de `queryHaiku` | explicito | Sim |
| prompts por tool moldam comportamento do agente | `src/services/claude.ts::querySonnetWithPromptCaching` usa `tool.prompt()` | explicito | Sim |
| wrapper MCP e genericamente permissivo | `src/tools/MCPTool/MCPTool.tsx` | explicito | Sim |
| CONDSTORE ja tem governanca mais forte para mutacao | `src/modules/frank/action-policy.ts`, `src/modules/frank/actions/review.ts`, `src/modules/frank/tools/tool-guard.ts` | explicito | Sim |

## 14.2 Descobertas com confianca MEDIA

| Item | Evidencia | Motivo da classificacao | Pode basear decisao? |
|---|---|---|---|
| assinatura exata do contrato `Tool` | imports + implementacoes concretas | o arquivo-fonte do tipo nao apareceu | Sim, com cautela |
| impacto exato do bug no sort de `toolResults` | mismatch visivel entre `.id` e `tool_use_id` | efeito exato depende do runtime concreto | Sim, como risco |
| semantica pretendida para user multi-block | comentario em `normalizeMessages` | comportamento visivel, intencao incompleta | Sim, como fragilidade |

## 14.3 Descobertas com confianca BAIXA

| Item | Evidencia | Motivo da classificacao | Pode basear decisao? |
|---|---|---|---|
| se os arquivos ausentes foram omitidos na reconstrucao ou nunca existiram em `src` | ausencia observada | causa nao verificavel | Nao |
| frequencia real de uso dos caminhos MCP/prompt mais raros | codigo suporta, uso real nao medido | depende de producao | Nao como prioridade |

---

## 15. Top 10 padroes realmente extraidos

| Padrao / componente | Arquivos que sustentam | Por que e real | Valor para o CONDSTORE | Risco de adocao | Decisao |
|---|---|---|---|---|---|
| loop recursivo orientado a tool | `src/query.ts` | e o runtime central | alto | medio | adaptar depois |
| separacao UI/API no contrato de mensagem | `src/utils/messages.tsx` | normalizacao e merge sao distintos | alto | baixo | adotar agora |
| pipeline de pre-execucao codificado | `src/query.ts` | schema, validate, permission e call em ordem fixa | alto | baixo | adotar agora |
| heuristica de concorrencia por read-only | `src/query.ts` | regra explicita | medio | medio | adaptar depois |
| stale-read guard para escrita | `src/tools/FileEditTool/FileEditTool.tsx`, `src/tools/FileWriteTool/FileWriteTool.tsx` | explicito | alto | baixo | adaptar depois |
| prompt por tool como contrato | `src/services/claude.ts` + prompts de tool | API usa `tool.prompt()` | alto | baixo | adotar agora |
| contexto persistente de sessao | `src/context.ts` | snapshot explicito | medio | baixo | adaptar depois |
| side-agent stateless | `src/tools/AgentTool/AgentTool.tsx`, `src/tools/AgentTool/prompt.ts` | explicito | baixo no MVP | alto | ignorar |
| transcript / replay sidechain | `src/utils/log.ts` | explicito | alto | baixo | adaptar depois |
| runtime MCP generico | `src/services/mcpClient.ts`, `src/tools/MCPTool/MCPTool.tsx` | explicito | baixo no MVP | alto | ignorar |

---

## 16. Traducao consolidada para o CONDSTORE

## 16.1 O que o CONDSTORE ja resolve melhor

| Tema | Arquivos do CONDSTORE | Motivo | Confianca |
|---|---|---|---|
| governanca de mutacao | `src/modules/frank/action-policy.ts`, `src/modules/frank/actions/review.ts` | policy e review server-side, nao prompt de terminal | ALTA |
| guard de tool por modo | `src/modules/frank/tools/tool-guard.ts` | bloqueio explicito de mutation em `assistant` | ALTA |
| decisao operacional supervisionada | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/frank/conversation-control.ts`, `src/modules/frank/auto-response-guard.ts` | regras de dominio, nao regras genericas | ALTA |
| trilha de decisao e telemetria | `src/infra/repositories/ai-decision-log.repository.ts`, `src/infra/repositories/frank-events.repository.ts`, `src/modules/audit/operational-audit.service.ts` | base ja existente para governanca | ALTA |
| governanca LLM transversal | `src/core/ai/llm-gateway.ts`, `src/core/ai/prompt-registry.ts` | PII, injection, budget, rate, circuit | ALTA |

## 16.2 O que esta parcial e deve ser formalizado

| Tema | Status | Arquivos | Acao |
|---|---|---|---|
| artefato de decisao por turno | PARCIAL | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` | FORMALIZAR |
| correlacao decisao -> sugestao -> execucao | PARCIAL | `src/infra/repositories/ai-decision-log.repository.ts`, `src/modules/frank/suggestions/suggestion.service.ts`, `src/modules/frank/actions/review.ts` | FORMALIZAR |
| registry unico de tools/actions | PARCIAL | `src/modules/frank/action-contracts.ts`, `src/modules/frank/action-policy.ts`, `src/modules/frank/tools/*` | FORMALIZAR |
| contrato explicito de anchors de sessao | PARCIAL | `src/modules/frank/session.repository.ts`, `src/modules/frank/intent-resolver.ts` | FORMALIZAR |

## 16.3 O que deve ser ignorado agora

- MCP / runtime de extensao
- side-agents
- prompt caching fino
- heuristicas auxiliares via modelo
- qualquer autonomia adicional fora do escopo supervisionado

Motivo:

- nao e necessario para o MVP
- aumenta acoplamento e imprevisibilidade

---

## 17. Gaps reais do CONDSTORE

### Maduro

- inbound supervisionado por WhatsApp
- gates de conversa e guard de auto-resposta
- review manual de acao
- trilha basica de decisao e auditoria

### Implicito e precisa ser formalizado

- artefato unico de turno
- correlacao ponta-a-ponta entre sugestao e execucao
- metadata central de tool/action
- anchors de sessao como contrato explicito

### Deve esperar

- runtime autonomo
- training / intents como superficie ativa
- knowledge / RAG como eixo principal
- console Frank e extensibilidade dinamica

---

## 18. Backlog executavel final

| PR | Contrato / interface exata | Arquivos exatos | Mudanca especifica | Impacto no runtime | Dependencias tecnicas | Risco tecnico real | Risco de regressao | Esforco relativo | Criterio de aceite |
|---|---|---|---|---|---|---|---|---|---|
| 1. `WhatsappTurnDecision` | `WhatsappTurnDecisionInput { intent, entities, confidence, timestamp, operatorOnline, entitiesComplete, autoResponsesCount, messageBody, conversationStatus, assignedTo, operatorRespondedRecently, hasConsent, productDetected, hasActiveSuggestion }` -> `WhatsappTurnDecision { gateResult, guardResult, policyResolution, shouldIncrementCounter }` | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/atendimento/whatsapp-turn-decision.ts`, `src/modules/atendimento/__tests__/whatsapp-inbound-orchestrator.service.test.ts`, novo `src/modules/atendimento/__tests__/whatsapp-turn-decision.test.ts` | extrair o calculo de gate, guard, policy e counter de dentro de `process(...)` para uma funcao pura de decisao de turno | torna o passo 6-7 do fluxo supervisionado explicitamente testavel e reduz acoplamento do orchestrator | nenhuma | drift de regra entre a funcao nova e o comportamento atual se houver ordem errada entre `resolveConversationMode`, `evaluateAutoResponseGuard` e `resolveInboundReplyPolicy` | medio em `SUPERVISED_NO_REPLY` e no contador de auto-resposta | 1 a 1.5 dias | a nova funcao reproduz exatamente os mesmos outcomes atuais para `frustration`, `incomplete_entities`, `operator_present`, `human_active` e `auto_response_limit` |
| 2. `WhatsappTurnDecisionLog` | `WhatsappTurnDecisionLog { messageId, tenantId, intent, confidence, gateMode, gateReason, guardBlocked, guardReason, policyType, hasSuggestion, productDetected, sessionId, conversationId }` serializado em `toolPayload` | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/infra/repositories/ai-decision-log.repository.ts`, `src/infra/repositories/__tests__/ai-decision-log.repository.test.ts`, `src/modules/atendimento/__tests__/whatsapp-inbound-orchestrator.service.test.ts` | persistir um decision transcript por turno usando `toolUsed='whatsapp_inbound_supervision_gate'` e payload JSON compacto | cria trilha unica para explicar por que o turno respondeu, supervisionou ou nao respondeu | PR 1 recomendado | payload ficar inconsistente entre log e retorno do orchestrator se os campos forem montados em dois lugares | baixo | 0.5 a 1 dia | cada turno nao deduplicado persiste um log com `gateMode`, `policyType` e `guardReason` coerentes com o retorno final |
| 3. `WhatsappSuggestionPipeline` | `WhatsappSuggestionPipelineInput { tenantId, conversationId, sessionId, customerId, intent, entities, productQuery, destinationZip, quantity, attribution }` -> `WhatsappSuggestionPipelineResult { createdSuggestion, suggestionId, productMatches, primaryProductId, freightQuoted }` | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/atendimento/whatsapp-suggestion-pipeline.service.ts`, `src/modules/atendimento/__tests__/whatsapp-inbound-orchestrator.service.test.ts`, novo `src/modules/atendimento/__tests__/whatsapp-suggestion-pipeline.service.test.ts` | isolar busca de produto, cotacao de frete, criacao de sugestao e emissao de eventos operacionais | separa o passo 8 do dominio de catalogo/frete do passo 6-7 de decisao de conversa | PR 1 recomendado para reduzir conflito no orchestrator | divergencia entre o texto de sugestao gerado hoje e o texto gerado no pipeline extraido | medio em `suggestion_created` e `freight_quoted` | 1.5 a 2 dias | produto unico, multiplos produtos, frete com sucesso e frete com falha continuam produzindo o mesmo comportamento funcional |
| 4. `SessionAnchors` explicito | `SessionAnchors { lastReferencedOrderId, lastReferencedShipmentId, lastReferencedQuoteId, lastReferencedCustomerId, previousIntent, lastToolUsed }` com adaptadores `fromSessionState(...)` e `toSessionUpdate(...)` | `src/modules/frank/session.repository.ts`, `src/modules/frank/session-anchors.ts`, `src/modules/frank/intent-resolver.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/frank/intent-resolver.test.ts` | tirar a montagem inline de anchors do orchestrator e formalizar o contrato contextual usado por `resolveContextualIntent(...)` | reduz a fragilidade do passo 2 de contexto e elimina mapeamento ad hoc de sessao para intent | nenhuma | mapeamento errado entre `SessionState` e `SessionAnchors`, especialmente em `lastOrderId` / `lastReferencedShipmentId` | baixo-medio em intents contextuais | 0.5 a 1 dia | `resolveContextualIntent(...)` continua reconhecendo pedido, shipment, quote e customer com a mesma precisao atual |
| 5. `FrankToolRegistry` | `FrankToolMetadata { toolName, access, entityDomain, handlerRef }` consumido por `executeFrankTool(...)` e pelos wrappers de tool | `src/modules/frank/tools/tool-registry.ts`, `src/modules/frank/tools/tool-guard.ts`, `src/modules/frank/tools/read-only/getOrderStatus.tool.ts`, `src/modules/frank/tools/read-only/getShipmentStatus.tool.ts`, `src/modules/frank/tools/read-only/getRecentOrders.tool.ts`, `src/modules/frank/tools/read-only/getRecentQuotes.tool.ts`, `src/modules/frank/tools/read-only/getCustomerContext.tool.ts`, `src/modules/frank/tools/create-order-from-quote.tool.ts`, `src/modules/frank/tools/tool-guard.test.ts` | centralizar metadata de tool e remover strings duplicadas de `toolName` / `access` | endurece o passo 7 de enforcement e prepara governanca uniforme por risco e dominio | PR 4 recomendado para reaproveitar `lastToolUsed`; independente do core WhatsApp | bloquear tool valida por metadata incorreta ou deixar passar mutation por cadastro errado | medio | 1 a 1.5 dias | todas as tools Frank passam pelo registry unico e mantem o mesmo bloqueio atual em `assistant` |
| 6. `FrankActionDispatcher` | `FrankActionDispatchInput { actionId, tenantId, type, payload, explainability, status }` -> `FrankActionDispatchResult { success, errorCode?, auditRef? }` | `src/modules/frank/actions/review.ts`, `src/modules/frank/actions/dispatch.ts`, `src/modules/frank/action-policy.ts`, `src/modules/frank/action-contracts.ts`, `src/modules/frank/action-policy.test.ts`, `src/modules/frank/actions/review.test.ts` | separar `review` de `dispatch`, deixando `review.ts` como aprovador/policy gate e `dispatch.ts` como executor explicitamente roteado | desacopla o passo 7 de policy do passo 8 de execucao nas acoes Frank | PR 5 recomendado; pode ser iniciado sem ele | action aprovada cair em handler errado ou continuar executando via caminho legado invisivel | medio-alto | 1.5 a 2 dias | action sem handler falha antes de mutar estado e actions habilitadas continuam executando com a mesma policy atual |
| 7. `SuggestionAuditRecord` | `SuggestionAuditRecord { suggestionId, conversationId, sessionId, tenantId, outcome, operatorId, edited, source }` | `src/modules/frank/suggestions/suggestion.service.ts`, `src/modules/audit/operational-audit.service.ts`, `src/modules/frank/suggestions/__tests__/suggestion.service.test.ts` | fazer `approveSuggestion`, `rejectSuggestion` e edicao gerarem uma trilha operacional unica | fecha a correlacao entre o passo 8 de execucao humana e o passo 9 de auditabilidade do fluxo supervisionado | PR 2 recomendado para reaproveitar correlation fields; PR 3 desejavel se o pipeline de sugestao for extraido | evento duplicado ou perda de idempotencia no approve/edit/reject | baixo | 0.5 a 1 dia | toda aprovacao, edicao e rejeicao gera registro auditavel com `conversationId`, `sessionId` e `operatorId` |

### Priorizacao por horizonte

#### Agora

- PR 1
- PR 2
- PR 3
- PR 4
- PR 7

#### Pos-MVP curto

- PR 5
- PR 6

#### Longo prazo

- qualquer coisa parecida com MCP
- side-agents
- runtime autonomo
- conhecimento / RAG como eixo principal

### Gates minimos por escopo

Para PRs 1-3:

- `npm run guardrail:mvp-freeze`
- `npm run test:whatsapp`
- `npm run lint`
- `npm run typecheck`

Para PRs 4-7:

- `npm run guardrail:mvp-freeze`
- `npm run test:mvp`
- `npm run lint`
- `npm run typecheck`

---

## 19. Matriz final de decisao

## 19.1 Decisoes arquiteturais

| Item | Valor | Risco | Esforco | Prioridade | Recomendacao final |
|---|---|---|---|---|---|
| artefato explicito de decisao por turno | alto | baixo | medio | P0 | implementar agora |
| contrato explicito de `SessionAnchors` | medio-alto | baixo | baixo | P1 | implementar agora |
| registry central de tools Frank | medio | medio | medio | P2 | pos-MVP curto |
| dispatcher separado de review | medio | medio-alto | medio | P2 | pos-MVP curto |
| re-entry recursivo generico estilo CLI | baixo no MVP | alto | alto | P4 | ignorar |

## 19.2 Decisoes operacionais

| Item | Valor | Risco | Esforco | Prioridade | Recomendacao final |
|---|---|---|---|---|---|
| transcript estruturado por turno | alto | baixo | baixo-medio | P0 | implementar agora |
| extracao do pipeline produto/frete | alto | baixo-medio | medio | P1 | implementar agora |
| auditoria do ciclo de sugestao | medio-alto | baixo | baixo | P1 | implementar agora |
| aprovacao manual antes de mutacao | alto | baixo | ja existe | P0 | manter sem alterar |
| runtime MCP/extensao no core | baixo no MVP | alto | alto | P4 | ignorar |

## 19.3 Decisoes estrategicas

| Item | Valor | Risco | Esforco | Prioridade | Recomendacao final |
|---|---|---|---|---|---|
| manter Frank no recorte supervisionado do MVP | alto | baixo | baixo | P0 | manter |
| usar `llm-gateway` como camada transversal, nao como centro do core WhatsApp | alto | baixo | baixo | P0 | manter |
| side-agents / autonomia multi-step | baixo no MVP | alto | alto | P4 | adiar indefinidamente |
| seguranca baseada em inferencia do modelo | valor negativo | alto | baixo | P4 | nao implementar |
| knowledge / RAG como eixo principal do fluxo core | baixo agora | medio-alto | alto | P4 | adiar |

---

## 20. Conclusao definitiva

O valor real de `leeyeel/claude-code-sourcemap` nao esta em autonomia CLI, MCP ou side-agents. Esta em tres contratos arquiteturais concretos:

- contrato de mensagem
- pipeline de pre-execucao
- prompt especifico por tool como contrato de comportamento

Para o CONDSTORE, a traducao correta e:

- formalizar o turno supervisionado
- reforcar correlacao e trilha de decisao
- consolidar contratos de acao/tool
- manter humano, policy e review no centro do fluxo

O que nao deve ser trazido agora:

- runtime de extensao generico
- side-agents
- heuristicas de seguranca baseadas em modelo
- qualquer desvio do recorte supervisionado do MVP

Em termos praticos, o proximo passo seguro nao e criar um novo runtime do Frank. E endurecer e formalizar o que o CONDSTORE ja tem de melhor no fluxo supervisionado.

---

## 21. Core Execution Artifact

Nome proposto do artefato central: `Execution Turn Envelope`.

Motivo:

- o runtime analisado nao possui um tipo unico explicito para isso
- o comportamento real do sistema emerge da combinacao entre `src/query.ts`, `src/utils/messages.tsx`, `src/services/claude.ts` e `src/screens/REPL.tsx`
- o nome acima e uma inferencia estrutural para eliminar a fragmentacao conceitual

Confianca:

- MEDIA para o nome do artefato
- ALTA para os campos e para o ciclo de vida abaixo, porque eles estao explicitamente espalhados no codigo

### 21.1 Estrutura completa reconstruida

| Campo | Obrigatorio | Origem real | Papel | Confianca |
|---|---|---|---|---|
| `systemPrompt` | sim | `src/constants/prompts.ts` `getSystemPrompt(...)` e `src/query.ts` `fullSystemPrompt` | instrucao estavel do turno | ALTA |
| `context` | sim | `src/context.ts` `getContext(...)` | contexto persistente do workspace/projeto | ALTA |
| `assistantMessage` | sim | `src/services/claude.ts` `querySonnet*` e `src/query.ts` `assistantMessage` | resposta do modelo que abre o turno executavel | ALTA |
| `toolUses[]` | derivado | `src/query.ts` `assistantToolUses` | conjunto de `tool_use` extraidos do `assistantMessage.message.content` | ALTA |
| `toolResults[]` | derivado | `src/query.ts` `toolResults` + `src/utils/messages.tsx` `createToolResultStopMessage(...)` | resultados correlacionados por `tool_use_id` | ALTA |
| `decision.executionMode` | derivado | `src/query.ts` `canRunConcurrently` | define `parallel`, `serial` ou `none` | ALTA |
| `decision.shouldSkipPermissionCheck` | derivado | `src/query.ts` `queryWithBinaryFeedback(...)` | altera a politica de aprovacao em side-paths especificos | ALTA |
| `decision.isTerminal` | derivado | `src/query.ts` ausencia de `tool_use` ou abort/cancel | define se o envelope fecha ou reentra no loop | ALTA |
| `runtimeState` | derivado | `src/query.ts` + `src/utils/messages.tsx` | marca se o turno esta em `model_returned`, `tool_pending`, `tool_running`, `tool_resolved`, `reentered` ou `terminated` | MEDIA |
| `auditSideEffects` | externo | `src/utils/log.ts`, `src/services/statsig.ts`, `src/services/sentry.ts` | trilha observavel do envelope, mas fora do objeto logico | ALTA |

### 21.2 Relacao entre `message`, `tool_use`, `tool_result`, `contexto` e `decisao`

- `contexto` nasce antes da chamada ao modelo em `src/context.ts` `getContext(...)` e entra no envelope como entrada imutavel do turno. Conf.: ALTA.
- `message` nasce em `src/query.ts` quando `querySonnet(...)` devolve `assistantMessage`; ele e o payload primario do turno. Conf.: ALTA.
- `tool_use` nasce como sub-bloco do `assistantMessage.message.content[]`; ele nao existe fora do `assistantMessage` ate ser extraido em `assistantToolUses`. Conf.: ALTA.
- `decisao` nasce logo apos a extracao dos `tool_use`: `src/query.ts` decide se o envelope vai para `parallel`, `serial` ou `exit`, e se a permissao pode ser pulada em casos especiais. Conf.: ALTA.
- `tool_result` nasce por `checkPermissionsAndCallTool(...)`, sempre vinculado por `tool_use_id`; ele fecha cada ramo executado do envelope. Conf.: ALTA.
- o envelope so reentra no loop quando existe `assistantMessage` + `toolResults[]` suficientes para montar o proximo historico. Conf.: ALTA.

### 21.3 Ciclo de vida dentro do loop

1. Nasce em `src/query.ts` `query(...)` imediatamente apos `querySonnet(...)` retornar `assistantMessage`. Conf.: ALTA.
2. Evolui para estado interpretado quando `assistantToolUses` e extraido do `assistantMessage.message.content`. Conf.: ALTA.
3. Evolui para estado decidido quando `canRunConcurrently` escolhe `parallel` ou `serial`. Conf.: ALTA.
4. Evolui para estado em execucao quando `runToolUse(...)` chama `checkPermissionsAndCallTool(...)`. Conf.: ALTA.
5. Evolui para estado resolvido quando cada tool produz `tool_result` ou erro convertido em `tool_result is_error=true`. Conf.: ALTA.
6. Termina como `reentered` quando `src/query.ts` chama recursivamente `query([...messages, assistantMessage, ...orderedToolResults], ...)`. Conf.: ALTA.
7. Termina como `terminal` quando nao ha `tool_use`, quando ha cancelamento, ou quando o runtime produz `INTERRUPT_MESSAGE` / `INTERRUPT_MESSAGE_FOR_TOOL_USE`. Conf.: ALTA.

### 21.4 Onde ele nasce, como evolui, como termina e como e auditado

| Aspecto | Evidencia | Descricao | Confianca |
|---|---|---|---|
| nascimento | `src/query.ts` `query(...)` | o envelope nasce no retorno do modelo, nao na REPL nem na tool | ALTA |
| evolucao | `src/query.ts` `runToolUse(...)`, `checkPermissionsAndCallTool(...)` | cada `tool_use` abre um sub-ramo de execucao dentro do mesmo turno | ALTA |
| termino | `src/query.ts` ausencia de `tool_use` ou recurse com `tool_result` | o envelope termina por saida final ou por reentrada no proximo turno | ALTA |
| auditoria local | `src/utils/log.ts` | transcript e sidechain de subagentes | ALTA |
| auditoria de produto | `src/services/statsig.ts` | eventos de sucesso, erro, prompt de permissao e progresso | ALTA |
| auditoria de excecao | `src/services/sentry.ts` | excecoes com `sessionId`, `cwd` e contexto de gate | ALTA |

Implicacao para o CONDSTORE:

- o equivalente nao deve ser um array solto de flags dentro do orchestrator
- o equivalente correto e um artefato de turno supervisionado explicitamente nomeado, persistivel e auditavel

---

## 22. Unified Agent Pipeline

O sistema analisado pode ser lido como um unico fluxo linear:

| Etapa | Responsabilidade | Arquivos envolvidos | Estado alterado | Risco operacional | Confianca |
|---|---|---|---|---|---|
| 1. Input | receber entrada do usuario e transforma-la em mensagens do runtime | `src/screens/REPL.tsx`, `src/utils/messages.tsx` `processUserInput(...)` | `messages[]`, `abortController`, estado de UI | comando local ou slash command desviar do caminho esperado do loop | ALTA |
| 2. Context Resolution | resolver snapshot do projeto e contexto adicional para o turno | `src/context.ts`, `src/screens/REPL.tsx` | `context`, `directoryStructure`, `gitStatus`, `readme`, `CLAUDE.md` | contexto stale ou insuficiente contaminar decisao do modelo | ALTA |
| 3. Prompt Assembly | compor `systemPrompt`, contexto e descricoes de tools | `src/constants/prompts.ts`, `src/services/claude.ts` | `fullSystemPrompt`, `tool.prompt(...)` enviado a API | regra critica ficar so em prompt e nao em codigo | ALTA |
| 4. Model Call | chamar o modelo principal e aplicar retry/caching | `src/query.ts`, `src/services/claude.ts` | `assistantMessage`, custo, duracao, flags de retry | erro de API, retry storm, resposta parcial ou sintese de erro | ALTA |
| 5. Interpretation Layer | extrair `tool_use`, normalizar conteudo e detectar terminalidade | `src/query.ts`, `src/utils/messages.tsx` | `assistantToolUses`, `normalizedMessages` | mismatch entre blocos do modelo e contrato interno de mensagem | ALTA |
| 6. Decision Layer | decidir se executa, em que ordem, e com qual estrategia | `src/query.ts` `canRunConcurrently`, `runToolsConcurrently(...)`, `runToolsSerially(...)` | `executionMode`, ordem de despacho | classificar tool errada como read-only e liberar paralelismo indevido | ALTA |
| 7. Policy Enforcement | validar schema, validar semantica e checar permissao | `src/query.ts` `checkPermissionsAndCallTool(...)`, `src/permissions.ts`, `src/hooks/useCanUseTool.ts`, `tool.validateInput(...)` | `tool_result is_error=true` ou permissao concedida | bypass de policy, falso negativo, falso positivo de aprovacao | ALTA |
| 8. Execution Layer | executar a tool e capturar progresso/resultado | `src/query.ts`, `src/tools/*` | side effects externos, `ProgressMessage`, `tool_result` | mutacao insegura, shell persistente, tool remota sem contrato forte | ALTA |
| 9. Result Normalization | transformar execucao em mensagens reentraveis e auditaveis | `src/query.ts`, `src/utils/messages.tsx` | `toolResults[]`, `orderedToolResults`, agrupamento de `tool_result` | correlacao errada entre `tool_use.id` e `tool_use_id` | ALTA |
| 10. Re-entry / Exit | recursar com o novo historico ou finalizar o turno | `src/query.ts`, `src/screens/REPL.tsx` | historico expandido ou `isLoading=false` | loop incompleto, saida sem `tool_result`, interrupcao parcial | ALTA |

Leitura operacional:

- `src/query.ts` concentra as etapas 4-10. Conf.: ALTA.
- `src/utils/messages.tsx` e a camada que garante que o que a UI mostra e o que volta para a API nao sejam a mesma estrutura bruta. Conf.: ALTA.
- o risco estrutural dominante do pipeline e a correlacao de mensagens: se `tool_use` e `tool_result` se desalinharem, o loop perde consistencia. Conf.: ALTA.

---

## 23. Condstore Execution Mapping

| Etapa do pipeline | Equivalente no CONDSTORE | Arquivos reais | Status | Nivel de formalizacao | Confianca |
|---|---|---|---|---|---|
| 1. Input | entrada webhook supervisionada e payload tipado de inbound | `src/app/api/whatsapp/incoming/route.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` `WebhookOrchestratorPayload` | explicito | medio | ALTA |
| 2. Context Resolution | resolucao de sessao, cliente, conversa e intent contextual | `src/modules/frank/session.repository.ts`, `src/modules/frank/intent-resolver.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/atendimento/customer-resolution.service.ts`, `src/infra/context-cache.ts` | explicito | medio | ALTA |
| 3. Prompt Assembly | existe fora do fluxo principal do WhatsApp supervisionado | `src/core/ai/prompt-registry.ts`, `src/core/ai/frank-orchestrator.ts`, `src/core/ai/llm-gateway.ts` | implicito | baixo | ALTA |
| 4. Model Call | existe para superficies Frank/AI, nao como centro do inbound supervisionado | `src/core/ai/llm-gateway.ts`, `src/core/ai/frank-orchestrator.ts` | implicito | medio | ALTA |
| 5. Interpretation Layer | resolucao deterministica de intent e entidades, sem parser generico de `tool_use` | `src/modules/frank/intent-resolver.ts`, `src/modules/frank/entity-resolver.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` | explicito | medio | ALTA |
| 6. Decision Layer | gate de conversa + guard de auto-resposta + policy de reply | `src/modules/frank/conversation-control.ts`, `src/modules/frank/auto-response-guard.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/atendimento/inbound-reply-policy.ts` | explicito | medio-alto | ALTA |
| 7. Policy Enforcement | policy de action, review obrigatorio e guard de tool por modo | `src/modules/frank/action-policy.ts`, `src/modules/frank/actions/review.ts`, `src/modules/frank/tools/tool-guard.ts` | explicito | alto | ALTA |
| 8. Execution Layer | servicos de dominio e sugestao supervisionada | `src/modules/frank/suggestions/suggestion.service.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/atendimento/freight-quote.service.ts`, `src/modules/logistics/shipment.service.ts` | explicito | medio | ALTA |
| 9. Result Normalization | retorno `InboundReplyPolicy`, logs de decisao, eventos de sugestao e auditoria operacional | `src/modules/atendimento/inbound-reply-policy.ts`, `src/infra/repositories/ai-decision-log.repository.ts`, `src/modules/frank/suggestions/suggestion.service.ts`, `src/modules/audit/operational-audit.service.ts` | implicito | baixo-medio | ALTA |
| 10. Re-entry / Exit | exit explicito; re-entry recursivo generico nao existe e nao deve existir agora | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/app/api/whatsapp/incoming/route.ts`, `src/modules/frank/whatsapp-orchestrator.ts` | explicito | medio | ALTA |

Leitura direta:

- o CONDSTORE ja tem um pipeline supervisionado completo para as etapas 1, 2, 5, 6, 7 e 8. Conf.: ALTA.
- as etapas 3 e 4 existem no subsistema AI, mas nao sao o centro do core WhatsApp supervisionado. Conf.: ALTA.
- a maior falta de formalizacao do CONDSTORE esta na etapa 9: o sistema devolve resultado e registra logs, mas ainda sem um contrato unico de turno. Conf.: ALTA.

---

## 24. Missing Explicit Contracts

| Contrato implicito no CONDSTORE | Onde existe hoje | Risco atual | Impacto em escala | Recomendacao objetiva | Confianca |
|---|---|---|---|---|---|
| `Message Contract` | `WebhookOrchestratorPayload`, `messageService.processInbound(...)`, `ContextMessage` em `src/infra/context-cache.ts`, `SaveDecisionLogInput` em `src/infra/repositories/ai-decision-log.repository.ts` | cada camada entende a mesma mensagem por uma shape diferente | dificulta replay, correlacao, debug e trilha multi-tenant | formalizar `OperationalTurnMessage` com ids, origem, direcao, intent, confidence, conversationId, sessionId e timestamps | ALTA |
| `Tool Execution Contract` | `src/modules/frank/tools/tool-guard.ts`, wrappers em `src/modules/frank/tools/read-only/*`, `src/modules/frank/tools/create-order-from-quote.tool.ts` | metadata de tool distribuida e dependente de strings | aumenta chance de bloqueio inconsistente por modo e de onboarding lento de novas tools | formalizar `FrankToolRegistry` com `toolName`, `access`, `entityDomain`, `handlerRef` e `auditActionType` | ALTA |
| `Decision Contract` | `ConversationGateResult`, `AutoResponseGuardResult`, `InboundReplyPolicy` e variaveis locais do orchestrator (`gateResult`, `guardResult`, `policyResolution`, `shouldIncrementCounter`) | a decisao do turno existe, mas fica quebrada em quatro estruturas e um booleano | em escala, auditoria e testes ficam presos ao fluxo de implementacao, nao ao contrato | formalizar `WhatsappTurnDecision` e tornar esse objeto a unidade de decisao supervisionada | ALTA |
| `Audit Contract` | `SaveDecisionLogInput`, `OperationalAuditService`, eventos de sugestao e logs estruturados | cada trilha responde a uma pergunta diferente e nao compartilha um envelope de correlacao | dificulta provar por que uma acao foi sugerida, aprovada, executada ou bloqueada | formalizar `TurnAuditRecord` e `SuggestionAuditRecord` com `tenantId`, `messageId`, `conversationId`, `sessionId`, `actor`, `outcome` e `reason` | ALTA |
| `Context Contract` | `SessionState`, `UpdateSessionParams`, `SessionAnchors` dentro de `src/modules/frank/intent-resolver.ts`, `ContextMessage` em cache | contexto operacional e contextual memory usam contratos diferentes e parcialmente redundantes | aumenta custo de evolucao das regras de intent, sessao e historico | formalizar `SessionAnchors` fora de `intent-resolver.ts` e definir fronteira clara entre `session state` e `conversation history` | ALTA |
| `Suggestion Lifecycle Contract` | `src/modules/frank/suggestions/suggestion.service.ts`, `suggestion.types.ts`, rotas de approve/reject, eventos `emitSuggestion*` | geracao, aprovacao, edicao e rejeicao nao compartilham um envelope unico de correlacao | auditoria operacional e explainability ficam fragmentadas | formalizar `SuggestionLifecycleRecord` com `suggestionId`, `sessionId`, `conversationId`, `intent`, `status`, `edited`, `operatorId` | ALTA |
| `Action Dispatch Contract` | `src/modules/frank/action-contracts.ts`, `src/modules/frank/action-policy.ts`, `src/modules/frank/actions/review.ts` | review, policy e execucao ainda se tocam cedo demais | impede clareza sobre o que e policy, o que e dispatch e o que e dominio | introduzir `FrankActionDispatcher` separado de `review.ts`, com entrada e saida tipadas | ALTA |

Ponto de decisao:

- nenhum desses contratos exige ampliar escopo do MVP
- todos sao formalizacoes de costuras que ja existem e ja sao usadas pelo core supervisionado

---

## 25. Architectural Boundaries

### 25.1 O que pertence ao runtime agentic

| Pertence | Evidencia no CONDSTORE | Limite |
|---|---|---|
| resolucao de contexto para o turno | `src/modules/frank/session.repository.ts`, `src/infra/context-cache.ts`, `src/modules/frank/intent-resolver.ts` | pode montar contexto, mas nao decidir regra de negocio por texto solto |
| montagem de prompt e chamada a provider | `src/core/ai/prompt-registry.ts`, `src/core/ai/llm-gateway.ts`, `src/core/ai/frank-orchestrator.ts` | deve continuar transversal; nao deve virar centro do core WhatsApp |
| registry e guard de tool/action | `src/modules/frank/tools/tool-guard.ts`, `src/modules/frank/action-policy.ts`, `src/modules/frank/actions/review.ts` | pertence ao runtime/governanca, nao ao dominio transacional |
| artefato de decisao por turno | hoje implicito em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` | deve ser explicitado como unidade tecnica do fluxo supervisionado |

### 25.2 O que pertence ao dominio de negocio

| Pertence | Evidencia no CONDSTORE | Limite |
|---|---|---|
| regra de conversa supervisionada | `src/modules/frank/conversation-control.ts`, `src/modules/frank/auto-response-guard.ts` | thresholds, intents sensiveis e horario comercial sao regras de operacao, nao de prompt |
| produto, frete, pedido, shipment e CRM | `src/modules/atendimento/*`, `src/modules/logistics/*`, `src/modules/clientes/*`, `src/modules/pedidos/*` | mutacao de negocio deve passar por servicos de dominio, nunca por wrapper generico |
| geracao e aprovacao de sugestao | `src/modules/frank/suggestions/suggestion.service.ts` e rotas de cockpit | pertence ao fluxo operacional supervisionado, nao a um runtime autonomo |

### 25.3 O que nunca deve ser misturado

| Mistura proibida | Motivo | Evidencia / decisao |
|---|---|---|
| policy critica dentro de prompt | prompt e orientacao; policy e enforcement | o repo analisado usa prompt por tool, mas o CONDSTORE ja faz melhor em `src/modules/frank/action-policy.ts` e `src/modules/frank/tools/tool-guard.ts` |
| tool runtime generico mutando dominio diretamente | perde governanca, auditoria e ownership de dominio | nao introduzir MCP generico, shell persistente ou wrapper passthrough no core |
| resposta automatica e aprovacao manual no mesmo contrato | mistura decisao automatica com autorizacao humana | manter `review.ts` separado de dispatch e manter `approve/edit/reject` com trilha propria |
| contexto de conversa e estado de dominio no mesmo blob opaco | degrada explainability e aumenta acoplamento | separar `SessionAnchors`, `SessionState` e `ContextMessage` |

### 25.4 Limites de extensibilidade, autonomia e execucao automatica

| Limite | Regra objetiva | Confianca |
|---|---|---|
| extensibilidade | nova tool ou acao so entra com contrato estatico, owner de dominio, metadata de risco, auditabilidade e teste | ALTA |
| autonomia | o core supervisionado nao deve ganhar recurse multi-step, side-agent ou loop generico de tool no MVP | ALTA |
| execucao automatica | mutation de pedido, shipment, CRM ou conversa nao executa sem handler explicito e review obrigatorio | ALTA |
| superficie AI | `llm-gateway` continua sendo capability transversal; nao deve puxar o roadmap do core WhatsApp supervisionado | ALTA |
| runtime externo | MCP, prompts remotos ou wrappers genicos nao entram no fluxo operacional principal | ALTA |

---

## 26. Canonical Condstore Contracts

Objetivo desta secao:

- transformar os contratos implicitos identificados nas secoes 23-25 em artefatos implementaveis
- reduzir a margem de interpretacao entre backlog e codigo
- manter o recorte no core supervisionado, sem puxar superficies frozen

Status desta secao:

- os contratos abaixo sao propostos para formalizacao no CONDSTORE
- todos foram reconstruidos a partir de estruturas reais ja presentes em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`, `src/modules/frank/*`, `src/infra/repositories/ai-decision-log.repository.ts` e `src/modules/audit/operational-audit.service.ts`
- a forma exata do nome e proposta; os campos e sua necessidade sao sustentados por evidencia real

### 26.1 `OperationalTurnMessage`

Evidencia de origem:

- `WebhookOrchestratorPayload` em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`
- `ContextMessage` em `src/infra/context-cache.ts`
- `messageService.processInbound(...)` chamado em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`
- `SaveDecisionLogInput` em `src/infra/repositories/ai-decision-log.repository.ts`

Contrato proposto:

```ts
interface OperationalTurnMessage {
  tenantId: string;
  messageId: string;
  sessionId: string;
  conversationId: string;
  phoneHash: string;
  direction: 'inbound' | 'outbound';
  channel: 'whatsapp';
  body: string;
  intent: string | null;
  confidence: number | null;
  providerEventId?: string | null;
  createdAt: string;
}
```

Campos obrigatorios:

- `tenantId`: sustentado por todas as costuras de persistencia e auditoria. Conf.: ALTA.
- `messageId`: hoje distribuido entre `messageSid` e `messageId`; deve virar id canonico do turno. Conf.: ALTA.
- `sessionId`: hoje e `fromHash` no fluxo WhatsApp e chave em `session.repository.ts`. Conf.: ALTA.
- `conversationId`: ja existe no fluxo de conversa e e necessario para trilha operacional. Conf.: ALTA.
- `intent` e `confidence`: ja persistidos no inbound e em `aiDecisionLogRepository`. Conf.: ALTA.

Uso recomendado:

- artefato-base do passo 1 do pipeline supervisionado
- entrada canonica de `WhatsappTurnDecision`
- payload de referencia para `TurnAuditRecord`

### 26.2 `WhatsappTurnDecision`

Evidencia de origem:

- `resolveConversationMode(...)` em `src/modules/frank/conversation-control.ts`
- `evaluateAutoResponseGuard(...)` em `src/modules/frank/auto-response-guard.ts`
- `resolveInboundReplyPolicy(...)` e `shouldIncrementCounter` em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`

Contrato proposto:

```ts
interface WhatsappTurnDecision {
  tenantId: string;
  messageId: string;
  sessionId: string;
  conversationId: string;
  gateMode: 'SUPERVISED' | 'ASSISTED' | 'AUTONOMOUS';
  gateReason: string;
  guardBlocked: boolean;
  guardReason: 'auto_response_limit' | 'operator_present' | 'human_active' | null;
  policyType: 'ACK_ONLY' | 'AUTO_REPLY_ALLOWED' | 'SUPERVISED_NO_REPLY';
  hasSuggestion: boolean;
  shouldIncrementCounter: boolean;
}
```

Campos obrigatorios:

- `gateMode`, `gateReason`: explicitamente produzidos por `resolveConversationMode(...)` e possivelmente sobrescritos por `evaluateAutoResponseGuard(...)`. Conf.: ALTA.
- `guardBlocked`, `guardReason`: explicitamente produzidos por `evaluateAutoResponseGuard(...)`. Conf.: ALTA.
- `policyType`: explicitamente retornado pelo orchestrator. Conf.: ALTA.
- `hasSuggestion`: hoje existe como `createdSuggestion`; precisa virar campo da decisao. Conf.: ALTA.
- `shouldIncrementCounter`: hoje e booleano local, mas altera persistencia de sessao; por isso deve entrar no contrato. Conf.: ALTA.

Uso recomendado:

- unidade canonica do passo 6-7 do pipeline do CONDSTORE
- payload primario do PR 1
- base unica do PR 2

### 26.3 `FrankToolMetadata`

Evidencia de origem:

- `FrankToolName`, `FrankToolAccess`, `executeFrankTool(...)` em `src/modules/frank/tools/tool-guard.ts`
- wrappers em `src/modules/frank/tools/read-only/*` e `src/modules/frank/tools/create-order-from-quote.tool.ts`

Contrato proposto:

```ts
interface FrankToolMetadata {
  toolName: FrankToolName;
  access: 'read_only' | 'mutation';
  entityDomain: 'conversation' | 'order' | 'shipment' | 'customer' | 'quote';
  handlerRef: string;
  auditActionType?: string;
}
```

Campos obrigatorios:

- `toolName`, `access`: ja existem no guard. Conf.: ALTA.
- `entityDomain`: hoje implicito nos wrappers; precisa ficar explicito para governanca e ownership. Conf.: ALTA.
- `handlerRef`: evita strings soltas e ajuda auditoria e testes. Conf.: MEDIA.

Uso recomendado:

- registry unico do PR 5
- base para no futuro ligar tool a risco, owner e auditoria sem espalhar metadata

### 26.4 `TurnAuditRecord`

Evidencia de origem:

- `SaveDecisionLogInput` em `src/infra/repositories/ai-decision-log.repository.ts`
- `LogOperationalActivityParams` em `src/modules/audit/operational-audit.service.ts`
- logs estruturados em `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts`

Contrato proposto:

```ts
interface TurnAuditRecord {
  tenantId: string;
  messageId: string;
  sessionId: string;
  conversationId: string;
  actor: 'system' | 'frank' | 'operator';
  stage: 'decision' | 'suggestion' | 'review' | 'execution';
  outcome: string;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}
```

Uso recomendado:

- envelope minimo de correlacao entre `aiDecisionLogRepository` e `operationalAuditService`
- contrato de longo curso para amarrar decisao automatica, acao humana e mutacao de dominio

Confianca:

- ALTA para necessidade do contrato
- MEDIA para o shape exato, porque hoje as duas trilhas sao separadas e precisarao de convergencia controlada

### 26.5 `SuggestionLifecycleRecord`

Evidencia de origem:

- `generateSuggestion`, `approveSuggestion`, `rejectSuggestion` em `src/modules/frank/suggestions/suggestion.service.ts`
- eventos `emitSuggestionGenerated`, `emitSuggestionApproved`, `emitSuggestionEdited`, `emitSuggestionRejected`

Contrato proposto:

```ts
interface SuggestionLifecycleRecord {
  tenantId: string;
  suggestionId: string;
  sessionId: string;
  conversationId: string;
  intent: string;
  status: 'generated' | 'approved' | 'edited' | 'rejected';
  operatorId?: string | null;
  edited?: boolean;
  createdAt: string;
}
```

Uso recomendado:

- contrato alvo do PR 7
- ponte entre o fluxo supervisionado do cockpit e a trilha operacional do turn

---

## 27. Runtime Invariants and Tenant Isolation

Esses invariantes nao sao ideias novas; eles ja estao sustentados por comportamento real do codigo e devem ser tratados como regras nao negociaveis da evolucao do CONDSTORE.

### 27.1 Invariantes de isolamento multi-tenant

| Invariante | Evidencia | Motivo | Pode ser quebrado? | Confianca |
|---|---|---|---|---|
| `tenantId` deve entrar em toda decisao, sessao, auditoria e execucao | `src/modules/frank/session.repository.ts`, `src/infra/repositories/ai-decision-log.repository.ts`, `src/modules/audit/operational-audit.service.ts`, `src/modules/frank/actions/review.ts`, `src/core/ai/llm-gateway.ts` | sem `tenantId`, o runtime perde isolamento logico e compliance operacional | nao | ALTA |
| leituras e mutacoes de review devem sempre filtrar por `tenantId` | `src/modules/frank/actions/review.ts` usa `getTenantId()` e `eq(...tenantId...)` em fetch, reject e approve | evita aprovacao ou execucao cross-tenant | nao | ALTA |
| sessao deve ser enderecada por `tenantId + sessionId` | comentario e queries em `src/modules/frank/session.repository.ts` | evita vazamento contextual entre clientes e tenants | nao | ALTA |
| provider AI deve ser resolvido por tenant | `src/core/ai/llm-gateway.ts` `getAIProviderWithMeta(tenantId)` | budget, modelo, rate limit e circuit breaker sao tenant-scoped | nao | ALTA |

### 27.2 Invariantes de governanca operacional

| Invariante | Evidencia | Motivo | Pode ser quebrado? | Confianca |
|---|---|---|---|---|
| nenhuma mutation Frank executa em `assistant` mode | `src/modules/frank/tools/tool-guard.ts` `executeFrankTool(...)` | separa assistencia de mutacao operacional | nao | ALTA |
| nenhuma action Frank muta estado sem `review_required` e policy valida | `src/modules/frank/actions/review.ts`, `src/modules/frank/action-policy.ts` | review e policy sao o ultimo gate antes da mutacao | nao | ALTA |
| guard de auto-resposta pode sobrescrever o gate de conversa | `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` linhas do `guardResult.blocked` -> `gateResult.mode = 'SUPERVISED'` | o sistema privilegia presenca humana e anti-loop sobre autonomia | nao | ALTA |
| contexto e enrichments falham em modo fail-open, mas nao podem quebrar o fluxo principal | `src/infra/context-cache.ts`, `src/modules/atendimento/whatsapp-inbound-orchestrator.service.ts` em attribution/funnel/logs | observabilidade e contexto enriquecem; nao dominam disponibilidade do core | nao no MVP | ALTA |

### 27.3 Invariantes de auditabilidade

| Invariante | Evidencia | Motivo | Pode ser quebrado? | Confianca |
|---|---|---|---|---|
| cada turno supervisionado deve poder explicar por que respondeu, supervisionou ou bloqueou | `gateResult`, `guardResult`, `policyResolution` no orchestrator e `SaveDecisionLogInput` no repository | sem isso, o sistema deixa de ser governavel | nao | ALTA |
| aprovacao, edicao e rejeicao de sugestao devem ser rastreaveis por operador | `src/modules/frank/suggestions/suggestion.service.ts` ja emite eventos e carrega `operatorId` | trilha humana e parte do produto, nao acessorio | nao | ALTA |
| erro de auditoria nao deve quebrar a operacao principal | `aiDecisionLogRepository.saveDecisionLog(...)` e `OperationalAuditService.logActivity(...)` absorvem falhas e logam erro | resiliencia operacional acima de acoplamento entre runtime e trilha | sim, mas nao deve impedir core | ALTA |

### 27.4 Sinais de regressao que devem bloquear PR

| Sinal | Impacto | Onde detectar | Acao |
|---|---|---|---|
| `tenantId` opcional em algum novo contrato do core | quebra isolamento multi-tenant | typecheck e review de interfaces | bloquear PR |
| nova tool ou action sem metadata central | reintroduz acoplamento distribuido | review do PR 5 em diante | bloquear PR |
| mutacao disparada fora de `review.ts` ou futuro `dispatch.ts` | enfraquece governanca | code review e testes de policy | bloquear PR |
| decisao de turno sem log correlacionavel | perde explainability operacional | testes do PR 2 e auditoria do fluxo | bloquear PR |
| sugestao aprovada/rejeitada sem `operatorId` ou `conversationId` | rompe trilha humana | testes do PR 7 e rotas de cockpit | bloquear PR |
