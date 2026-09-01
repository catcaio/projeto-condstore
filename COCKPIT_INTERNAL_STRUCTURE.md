# Cockpit Internal Structure — CONDSTORE OS

## Objetivo

Esta entrega reorganiza a entrada interna do Cockpit para refletir a filosofia operacional da Home pública: o usuário deve conseguir atender, negociar, cotar, vender, acompanhar e resolver sem sentir que trocou de sistema.

A Home pública não foi alterada nesta entrega. A mudança está restrita à superfície interna de `/cockpit` e preserva o domínio, as APIs, os contratos de tenant, as permissões e as integrações existentes.

## Arquitetura anterior

A entrada do Cockpit combinava um dashboard de métricas com uma grade de salas especializadas. Embora as capacidades estivessem disponíveis, o modelo mental exigia que o operador escolhesse previamente entre atendimento, pipeline, pedidos, logística, inteligência e configurações. Isso favorecia a percepção de módulos independentes e colocava métricas antes do trabalho que precisava ser executado.

O sistema continua possuindo essas rotas e módulos por razões de compatibilidade e profundidade operacional. A alteração não removeu essas capacidades; ela mudou a ordem de atenção na entrada principal.

## Arquitetura implementada

A rota `/cockpit` agora é uma **Workspace operacional** organizada em quatro níveis:

1. **Orientação imediata:** cabeçalho de visão operacional, estado resumido e ações rápidas.
2. **Fila de trabalho:** tarefas priorizadas por impacto, com idade, contexto e ação para abrir a jornada relacionada.
3. **Contexto conectado:** resumo de conversas, pedidos e logística, mantendo as entidades próximas sem exigir navegação por módulos.
4. **Pulso da operação:** métricas existentes continuam disponíveis, mas abaixo da fila e com linguagem explicitamente orientada à decisão.

A hierarquia atende simultaneamente operador e gestor. O operador recebe instruções para resolver o próximo passo; gestores recebem uma leitura de gargalos, pessoas e processos sem precisar de uma aplicação separada.

## Componentes criados ou modificados

| Componente | Mudança |
|---|---|
| `src/app/(app)/cockpit/page.tsx` | Mantém o guard de tenant e passa a renderizar a Workspace operacional. |
| `src/app/(app)/cockpit/_components/CockpitWorkspace.tsx` | Novo shell contextual com fila de trabalho, busca, ações rápidas, contexto conectado, sugestão do Frank e pulso de métricas. |
| `CockpitOperationalDashboard` | Preservado e reutilizado como camada de métricas da nova Workspace. |
| `src/app/(app)/cockpit/pipeline/pipeline.client.tsx` | Reorganizado como Kanban responsivo com busca, métricas compactas, filtros de coluna no mobile e drag-and-drop otimista. |
| `src/ui/shell/app-shell.tsx` | Barra lateral desktop passou a ocupar uma faixa compacta e expandir por hover, sem deslocar o conteúdo principal. |
| `src/ui/shell/app-nav.tsx` | Rótulos e grupos da navegação desktop ficam ocultos no estado compacto e aparecem no hover; o menu mobile continua explícito e independente. |

## Decisões de experiência

A fila de trabalho é o primeiro conteúdo acionável. Cada item informa o que precisa ser feito, por que importa, qual entidade está relacionada, há quanto tempo aguarda e para qual contexto o usuário pode navegar.

A busca é local e imediata para a fila visível, servindo como uma camada de descoberta sem criar uma nova página ou duplicar o command center existente. A ação “Nova ação” direciona para o início da jornada de atendimento já disponível.

O contexto conectado usa links para as superfícies canônicas existentes: atendimento, pedidos e logística. A sugestão do Frank é apresentada como recomendação operacional, sem executar automaticamente ações de risco.

A resposta visual é responsiva desde telas pequenas. No desktop, a fila e o painel contextual convivem lado a lado. No mobile, o painel se empilha, os controles reduzem sua densidade e as ações continuam acessíveis por toque e teclado.

O Kanban segue a mesma lógica. Em desktop, as colunas permanecem lado a lado em uma faixa horizontal com cartões arrastáveis. Em mobile, apenas a coluna selecionada ocupa a tela e uma régua de etapas permite trocar de contexto rapidamente, evitando uma parede de cartões comprimidos. A busca filtra os cartões atuais e a movimentação continua otimista, com restauração automática em caso de falha.

A navegação global desktop permanece compacta por padrão, com ícones visíveis e rótulos acessíveis no tooltip. Ao passar o mouse sobre a faixa lateral, ela se expande sobre a área adjacente em vez de alterar a largura do conteúdo. No mobile, o menu continua usando abertura explícita, pois hover não é uma interação confiável em telas de toque.

O Kanban também passou a exibir sinais de inteligência operacional derivados dos dados carregados: oportunidades em andamento, itens aguardando ação, idade média desde a última mensagem, cartão mais antigo, cotações enviadas e win rate. Esses indicadores apoiam priorização sem criar uma tela paralela de analytics.

Os atalhos de teclado foram desenhados para ações frequentes e não interferem durante a digitação: `/` foca a busca, `R` atualiza os dados, `N` abre uma nova conversa, `1–6` seleciona uma etapa, `?` abre a ajuda e `Esc` fecha a ajuda ou remove o foco da busca.

## Funcionalidades preservadas

Nenhuma API, tabela, integração, permissão, rota existente ou fluxo válido foi removido. Os dados reais do dashboard continuam sendo carregados pelos endpoints já existentes de métricas, funil e frete. O tenant continua vindo do header autenticado e o comportamento de superadmin com `tenantId` de inspeção foi preservado.

A nova fila usa uma camada de orientação operacional na entrada principal. Ela não substitui os dados de produção nem altera o domínio. Os fluxos profundos continuam disponíveis nas rotas canônicas e legadas já existentes.

## Rotas afetadas

Apenas `/cockpit` foi alterada visualmente nesta entrega. As rotas relacionadas utilizadas como destinos contextuais são:

- `/cockpit/atendimento` para conversas;
- `/cockpit/pipeline` para negociações e cotações;
- `/cockpit/orders` para pedidos;
- `/logistica/envios` para shipments;
- `/cockpit/metrics` para o detalhamento das métricas.

## Limitações conhecidas

A fila inicial ainda utiliza itens de trabalho definidos na camada de apresentação. A próxima evolução natural é alimentar esses itens por uma consulta operacional real, reaproveitando os contratos existentes ou adicionando um endpoint específico sem acoplar a interface a dados fictícios.

A busca desta entrega atua sobre a fila renderizada; o command palette global continua sendo a camada adequada para descoberta transversal do sistema.

## Testes recomendados

Após a alteração, executar `npm run lint`, `npm run typecheck`, `npm run build` e os testes existentes do Cockpit. Nesta entrega, `npm run typecheck`, `npm run lint` e `npm run test:cockpit` foram executados com sucesso; a suíte específica do Cockpit reportou 21 arquivos e 58 testes aprovados. O build de produção anterior do Cockpit também foi aprovado antes desta extensão de interface. A validação funcional deve cobrir `/cockpit`, `/cockpit/atendimento`, `/cockpit/pipeline`, `/cockpit/orders` e `/logistica/envios` em desktop e mobile, incluindo tenant autenticado e perspectiva de operador e gestor.

## Critério de realidade

> O usuário está navegando pelo sistema ou está realizando o trabalho?

A nova entrada prioriza a segunda resposta: a navegação existe, mas aparece subordinada ao trabalho, ao contexto e à próxima decisão operacional.
