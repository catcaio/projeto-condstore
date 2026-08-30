# Integração BELA no CONDSTORE

## Objetivo

O CONDSTORE é um projeto **Next.js/React com TypeScript**, organizado principalmente em `src/app`, `src/modules`, `src/infra`, `src/core`, `src/ui`, `src/workers` e `drizzle`. A integração BELA exporta os metadados arquiteturais que o updater oficial consegue inferir desse código, sem enviar linhas de implementação. O resultado é um arquivo ECD que pode ser carregado na fonte do projeto no BELA.

A referência oficial descreve o modelo **Elements–Containments–Dependencies (ECD)** e informa que a sincronização inclui metadados até nomes de métodos, funções e campos, mas não o conteúdo das linhas de código [1].

## Arquivos implementados

| Arquivo | Finalidade |
| --- | --- |
| `.bela/README.md` | Explica o diretório e o comportamento do artefato gerado. |
| `.bela/.gitignore` | Impede o versionamento de `bela-update.ecd`. |
| `scripts/bela-update.sh` | Executa o updater oficial em container isolado e valida o cabeçalho ECD. |
| `.github/workflows/bela.yml` | Gera o ECD após build e faz upload ao BELA quando os secrets estão disponíveis. |
| `docs/bela-integration.md` | Este guia operacional. |

## Execução local

Instale as dependências e gere o build normalmente:

```sh
npm ci
npm run build
```

Depois execute:

```sh
npm run bela:update
```

O script usa a imagem oficial `juxhouse/bela-updater-typescript`, monta o repositório em `/workspace:ro`, monta `.bela` para receber o resultado e desabilita a rede do container com `--network=none`. Esse isolamento segue o procedimento oficial [1]. O arquivo esperado é `.bela/bela-update.ecd`.

A fonte enviada ao BELA é `GITHUB_REPOSITORY` quando essa variável existe; localmente, o padrão é `catcaio/projeto-condstore`. É possível substituir a fonte sem editar o script:

```sh
BELA_SOURCE=catcaio/projeto-condstore npm run bela:update
```

A execução requer Docker e um daemon Docker ativo. O script falha explicitamente se Docker não estiver instalado, se o daemon estiver indisponível, se o ECD não for gerado ou se o cabeçalho não for `v1` seguido de uma linha `source`.

## GitHub Actions

O workflow `.github/workflows/bela.yml` é separado dos workflows existentes e executa em `push` para `main`, pull requests e `workflow_dispatch`. Ele instala as dependências, executa `npm run build`, gera o ECD e publica o arquivo como artefato temporário do workflow. Em pull requests, o upload para o servidor BELA não é realizado; isso evita alterar uma fonte compartilhada a partir de código ainda não integrado.

Em `push` para `main` e em execução manual, o workflow tenta enviar o ECD para:

```text
https://<BELA_HOST>/api/ecd-architecture
```

O endpoint e o cabeçalho são os definidos na API oficial do BELA [2]. A sincronização substitui o conjunto atual da fonte, permitindo que o BELA remova elementos que deixaram de existir [2].

## Secrets necessários

Configure os valores em **Settings → Secrets and variables → Actions → New repository secret** no repositório `catcaio/projeto-condstore`:

| Secret | Valor | Uso |
| --- | --- | --- |
| `BELA_HOST` | Host exclusivo informado pela conta BELA, sem `https://` | Monta a URL da API. |
| `BELA_API_TOKEN` | Token obtido em `BELA → Sources → Use API` | Enviado somente pelo runner no cabeçalho `Authorization: Token ...`. |

Nenhum valor real foi incluído no código, nos commits ou neste documento. Se os secrets não estiverem configurados, a geração do ECD continua sendo executada, mas o upload é ignorado com uma mensagem clara. A documentação oficial informa que cada conta possui um host próprio e que o token é obtido na tela de uso da API [2].

## MCP

O BELA documenta um endpoint MCP em:

```text
https://<BELA_HOST>/mcp
```

A configuração do cliente deve usar o cabeçalho `Authorization: <BELA_API_TOKEN>` conforme o exemplo oficial. Um modelo seguro, sem credencial persistida, é:

```json
{
  "mcpServers": {
    "bela-condstore": {
      "url": "https://${BELA_HOST}/mcp",
      "headers": {
        "Authorization": "${BELA_API_TOKEN}"
      }
    }
  }
}
```

O MCP oficial lista operações como busca de elementos, contexto completo, hierarquia de containers e dependências de entrada e saída [3]. A configuração efetiva do cliente não foi commitada porque depende do host e do token da conta BELA. Depois do primeiro upload, valide `element-search`, `element-context-get`, `with-containers-up`, `deps-in` e `deps-out` no cliente MCP escolhido.

## Arquitetura detectável e limites

O updater oficial deve identificar elementos reais presentes no código TypeScript/JavaScript, seus caminhos e dependências que o analisador conseguir inferir. Pela estrutura observada, os agrupamentos técnicos relevantes incluem aplicação web em `src/app`, módulos de domínio em `src/modules`, infraestrutura em `src/infra`, núcleo em `src/core`, componentes de interface em `src/ui`, workers em `src/workers` e schema/migrações em `drizzle`.

Esses diretórios são descritos como estrutura técnica, não como domínios de negócio inventados. O updater não deve ser usado para criar relações que não existam no código. Domínios, serviços externos, consumidores de API, produtores/consumidores de eventos e relações operacionais que não estejam expressos nos artefatos podem precisar ser modelados manualmente no BELA. O formato ECD permite tipos customizados e metadados JSON, mas esta integração inicial não adiciona elementos fictícios [4].

## Segurança

O workflow declara `permissions: contents: read` e não utiliza permissões de escrita. O token BELA fica disponível somente no passo de upload, não é impresso e não é armazenado no artefato ECD. O analisador recebe o código como volume somente leitura e executa sem rede. O ECD gerado é ignorado pelo Git e mantido como artefato temporário do Actions.

## Troubleshooting

Se `npm run bela:update` informar que Docker não está instalado, instale Docker no ambiente local ou execute o workflow no GitHub Actions, cujo runner Ubuntu possui o runtime necessário. Se o arquivo não for produzido, confirme que o build terminou sem erro, que o daemon está ativo e que a imagem `juxhouse/bela-updater-typescript` pode ser obtida pelo runner.

Se o workflow gerar o ECD mas não fizer upload, verifique os dois secrets, especialmente se `BELA_HOST` foi informado sem o protocolo. Se a API responder com erro HTTP, confirme o host da conta, o token em vigor e a disponibilidade da fonte no BELA. O endpoint oficial é `POST /ecd-architecture` no host da conta [2].

Se uma relação arquitetural não aparecer, trate isso como limitação de inferência até validar o código e o ECD gerado; não adicione uma dependência manual apenas para preencher um diagrama. Use o MCP depois do upload para consultar os elementos efetivamente publicados.

## Referências

[1]: https://github.com/juxhouse/bela-resources/blob/main/CodeSynchronization.md "BELA — Code Synchronization"

[2]: https://github.com/juxhouse/bela-resources/blob/main/API.md "BELA — Web API"

[3]: https://github.com/juxhouse/bela-resources/blob/main/MCP.md "BELA — MCP Connector"

[4]: https://github.com/juxhouse/bela-resources/blob/main/reference/ECD-File-Format.md "BELA — ECD File Format"
