# Integração Linear <> Antigravity (MCP)

Este documento descreve a configuração e o funcionamento da integração entre o Google Antigravity e o Linear utilizando o protocolo MCP (Model Context Protocol).

## Decisão Arquitetural

- **Método**: Utilização do MCP oficial remoto do Linear (`https://mcp.linear.app/mcp`).
- **Motivo**: Abordagem mais simples, segura e mantida oficialmente pelo Linear, evitando a necessidade de infraestrutura própria ou apps OAuth complexos nesta fase inicial.

## Configuração do Servidor MCP

O servidor foi adicionado ao arquivo de configuração global do Antigravity:
- **Caminho**: `%USERPROFILE%\.gemini\antigravity\mcp_config.json`
- **Configuração**:
```json
{
  "mcpServers": {
    "linear": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
      "env": {}
    }
  }
}
```

## Como Validar a Conexão

1. No painel do Antigravity, acesse **Agent Panel > ... > MCP Servers**.
2. O servidor `linear` deve aparecer. Se o status for "Needs Authorization" ou similar:
   - Clique em **Authorize** ou no botão de login que o Antigravity exibir.
   - O navegador abrirá a página do Linear para você autorizar o acesso.
3. Assim que estiver **Active**, você pode pedir ao agente:
   - "Liste meus times no Linear"
   - "Crie uma issue de teste: [MCP TEST] Antigravity conectado ao Linear"

## Testes Funcionais Executados

- [x] Configuração do `mcp_config.json` aplicada.
- [x] Verificação de ambiente (Node.js/npx disponíveis).
- [x] Autenticação (Concluída pelo usuário).
- [x] Criação de issue de teste (MPV-83 criada com sucesso).
- [x] Comentário em issue (Adicionado à MPV-83).

## Diferenças de Interação

| Modelo | Descrição |
| :--- | :--- |
| **Antigravity -> Linear (MCP)** | O agente local "empurra" e "puxa" dados do Linear sob demanda do usuário. Ideal para desenvolvimento local. |
| **Linear -> Agente (Mentionable)** | O Linear "chama" um agente quando ele é mencionado (@Antigravity). Requer OAuth e Webhooks. |

### 💡 Dica: Acesso Remoto via Linear
Para que você tenha acesso ao Antigravity fora da sua máquina (mobile ou outro PC), o caminho ideal é a implementação do **Linear Agent Bridge**. 
Ao configurar o Antigravity como um `app:mentionable`, você poderá:
1. Abrir o app do Linear no celular.
2. Comentar em uma issue: "@Antigravity, atualize o schema do banco para incluir o campo X".
3. O Antigravity (se estiver rodando ou via uma bridge na nuvem) recebe o evento, processa e responde diretamente no thread do Linear.
Isso transforma o Linear no seu "Console de Comando" móvel para o CONDSTORE OS.

## Riscos de Segurança e Boas Práticas

- **Segredos**: Nunca salve o token de API do Linear no repositório. O login deve ser feito via fluxo OAuth interativo ou inserido no ambiente seguro do Antigravity.
- **Privilégios**: Use o menor privilégio necessário.
- **Isolamento**: O MCP opera no contexto do usuário autenticado.

## Próximos Passos (Linear Agent Bridge)

A próxima etapa envolve transformar o Antigravity em um "Actor" dentro do Linear:
1. Criar App OAuth no Linear.
2. Habilitar `actor=app` com escopos `app:mentionable` e `app:assignable`.
3. Configurar webhook `AgentSessionEvent`.
4. Expor endpoint seguro para recepção de eventos.
