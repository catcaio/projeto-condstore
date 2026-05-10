# ClickUp Antigravity Integration - CONDSTORE OS

Este documento descreve a integração técnica entre o agente Antigravity e a API REST do ClickUp, operando como o cockpit administrativo oficial do CONDSTORE OS.

## Arquitetura de Integração

A integração está localizada em `tools/clickup/` e segue uma arquitetura modular:

- `clickup-client.ts`: Cliente base para chamadas REST (GET, POST, PUT, DELETE).
- `clickup-types.ts`: Definições de tipos TypeScript para objetos do ClickUp.
- `clickup-config.ts`: Gerenciamento de variáveis de ambiente e validação.
- `clickup-logger.ts`: Logger sanitizado que impede o vazamento de tokens em logs.
- `clickup-guards.ts`: Travas de segurança para operações em `DRY_RUN` e operações destrutivas.

## Configuração (Variáveis de Ambiente)

As variáveis devem ser configuradas no arquivo `.env.local`:

```env
CLICKUP_API_TOKEN="pk_..."
CLICKUP_WORKSPACE_ID="90171032603"
CLICKUP_DEFAULT_SPACE_ID="90174736188"
CLICKUP_CONDSTORE_FOLDER_ID="90177827804"
CLICKUP_DRY_RUN="true"
CLICKUP_ALLOW_DESTRUCTIVE="false"
```

## Scripts Disponíveis (NPM)

| Script | Descrição |
| :--- | :--- |
| `npm run clickup:smoke` | Valida a conexão e a existência do Workspace. |
| `npm run clickup:hierarchy` | Lista a hierarquia de Pastas e Listas no Space atual. |
| `npm run clickup:audit` | Realiza uma auditoria no setup atual (tarefas sem dono, sem descrição, etc). |
| `npm run clickup:create-structure` | Cria a nova estrutura de 11 pastas e múltiplas listas do CONDSTORE OS. |
| `npm run clickup:create-task` | Cria uma nova tarefa. Requer `<listId>` e `<taskName>`. |
| `npm run clickup:sync-report` | Adiciona um comentário de relatório em uma tarefa específica. |

## Guardrails de Segurança

1. **Dry Run por Padrão**: O sistema inicia com `CLICKUP_DRY_RUN=true`. Nenhuma alteração real é feita na API até que seja alterado para `false`.
2. **Proteção Destrutiva**: Operações de `delete` ou `archive` requerem `CLICKUP_ALLOW_DESTRUCTIVE=true`.
3. **Log Sanitizado**: O token de API nunca é exibido em texto puro nos logs do console.
4. **Isolamento de Escopo**: Os scripts operam preferencialmente dentro do Workspace/Space configurado.

## Workflow de Operação

Sempre que o Antigravity precisar interagir com o ClickUp, ele utilizará estes scripts ou o cliente interno para garantir que a estrutura do projeto esteja sincronizada com a execução no GitHub.

### Template de Tarefa
Novas tarefas criadas seguem o padrão:
- Objetivo
- Contexto
- Escopo
- Fora de escopo
- Executor recomendado
- Modelo recomendado
- Apps envolvidos
- Workflow acionado
- Critérios de aceite
- Evidências obrigatórias
- Riscos
- Status final esperado
