# Auditoria de Usabilidade e Responsividade do Cockpit

**Data:** 7 de setembro de 2026  
**Escopo:** Cockpit autenticado, shell de aplicação, dashboard, Pedidos, Atendimento, tabelas administrativas, filtros, estados de carregamento e navegação em múltiplas larguras.  
**Status:** Diagnóstico concluído. Nenhuma alteração adicional de código foi feita nesta etapa.

## Conclusão executiva

A correção recente do Sidebar e do Topbar resolve o principal problema estrutural da navegação global. Ainda existem, porém, oportunidades relevantes de usabilidade e responsividade dentro dos módulos do Cockpit. O maior risco está concentrado em três áreas: **Pedidos**, **Atendimento** e **tabelas administrativas**.

Em smartphones, o dashboard principal apresenta cartões muito densos, a tela de Pedidos depende de uma interação de arrastar e soltar que não é adequada para toque, e o Atendimento utiliza uma arquitetura de três painéis com camadas sticky e drawers sobrepostos. Em tablets e notebooks estreitos, essa combinação pode reduzir o espaço útil, aumentar a rolagem e tornar ações importantes menos descobríveis.

A recomendação é priorizar primeiro as alterações que removem bloqueios funcionais em telas pequenas, depois as melhorias de densidade visual e, por fim, os refinamentos de acessibilidade e feedback.

## Classificação de prioridade

| Prioridade | Área | Impacto | Evidência encontrada | Recomendação |
|---|---|---:|---|---|
| P0 | Pedidos | Alto | O fluxo de mudança de status usa `draggable`, `onDragStart` e `onDrop`, sem ação equivalente por toque ou teclado. | Adicionar ação “Alterar status” por menu ou modal e manter drag-and-drop apenas como atalho em desktop. |
| P1 | Atendimento | Alto | Lista, conversa e contexto operacional coexistem em painéis sobrepostos, com drawer de `320px` a `400px` e múltiplos elementos sticky. | Definir modos explícitos por breakpoint: lista, conversa e contexto, com navegação de retorno e foco gerenciado. |
| P1 | Dashboard | Médio/alto | O resumo usa oito métricas em `grid-cols-2` até `lg`, o que gera cartões estreitos em 320–430px. | Usar uma coluna em smartphones pequenos, duas colunas a partir de uma largura mínima e priorizar métricas críticas. |
| P1 | Tabelas | Alto | Auditoria e Tabelas de Frete usam tabelas extensas; a tabela de frete possui muitas células editáveis. | Aplicar tabela com rolagem horizontal controlada, coluna-chave fixa, versão compacta em cards ou edição por formulário no mobile. |
| P1 | Feedback | Médio | Há estados de carregamento textuais e overlays de transição, mas a consistência de skeleton, erro, retry e anúncio para leitor de tela não é uniforme. | Padronizar `loading`, `error`, `empty`, `retry`, `aria-live` e foco após ações. |
| P2 | Command Bar | Médio | A Command Bar reorganiza a busca para uma nova linha em telas pequenas e mantém conteúdo secundário na mesma hierarquia. | Reduzir o texto auxiliar no mobile e transformar busca e ações em controles prioritários com largura previsível. |
| P2 | Touch targets | Médio | Alguns botões internos usam padding pequeno, especialmente refresh, fechar painel e ações de tabela. | Garantir área mínima aproximada de 44×44px e incluir `aria-label` em ícones isolados. |
| P2 | Tipografia e idioma | Médio | Há textos sem acentuação em vários pontos da navegação e dos fluxos operacionais. | Normalizar português da interface e reduzir labels longos em áreas de alta densidade. |
| P3 | Performance percebida | Médio | Atendimento atualiza conversas a cada 15s e mensagens a cada 8s, além de rolar suavemente para o fim a cada atualização. | Pausar polling quando a aba estiver oculta, evitar scroll forçado quando o usuário estiver lendo histórico e aplicar backoff em erro. |

## Achados detalhados

### 1. Dashboard principal: densidade excessiva em smartphones

O componente `CockpitOverviewBlock` apresenta oito cartões em uma grade de duas colunas até o breakpoint `lg`. Em 320px e 375px, cada cartão fica com largura reduzida, enquanto títulos como “Tempo de Resposta Médio” e “Erros Críticos (24h)” podem ocupar duas linhas ou competir com valores longos.

A estrutura atual também usa `p-5` e valor tipográfico de `text-2xl`, o que aumenta a altura dos cartões. A experiência tende a gerar uma sequência longa de cartões sem indicar quais métricas exigem ação imediata.

**Recomendação:** usar `grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-4`, destacar de três a quatro KPIs operacionais e agrupar métricas secundárias em uma seção recolhível ou em uma segunda faixa. Os valores devem aceitar quebra controlada e não depender de uma linha única.

### 2. Pedidos: drag-and-drop não é uma interação suficiente

A tela de Pedidos organiza seis colunas horizontais de `w-72` e permite alterar status por arrastar cartões. A rolagem horizontal é aceitável para desktop, mas não resolve o problema de interação em touch. Arrastar elementos HTML também pode ser inconsistente em dispositivos móveis e não oferece uma alternativa clara para teclado.

O texto vazio “Arraste pedidos para cá” é inadequado para um usuário que não pode arrastar naquele contexto. Além disso, seis colunas de negócio em sequência exigem muita navegação lateral para localizar um estágio.

**Recomendação:** adicionar um botão ou menu “Alterar status” em cada cartão. No mobile, preferir uma lista filtrável por status ou um seletor de estágio no topo. O drag-and-drop deve permanecer como aceleração opcional em ponteiro fine, nunca como único caminho funcional.

### 3. Atendimento: três painéis e múltiplas camadas concorrentes

O Atendimento usa uma lista de conversas, um painel de chat e um painel de contexto operacional. A lista ocupa `320px` ou `360px`, o contexto ocupa `320px` a `400px`, e o contexto vira drawer abaixo de `2xl`. Em telas intermediárias, a combinação de lista, chat, drawer e backdrop pode produzir sobreposição difícil de entender.

O painel de contexto é aberto por um botão que só mostra o texto a partir de `sm`; em smartphones pequenos resta apenas um ícone, embora a ação seja importante. O botão de fechamento da conversa também aparece somente como ícone, sem indicação textual ou confirmação visual persistente do modo atual.

O compositor de mensagem usa `sticky` no rodapé e o painel de sugestão de Frank usa outro `sticky` acima dele. Em alturas pequenas, essas duas áreas podem consumir grande parte da tela disponível para mensagens. O scroll suave automático para o fim da conversa também pode interromper a leitura de mensagens antigas quando ocorre polling.

**Recomendação:** tratar o Atendimento como uma navegação em modos no mobile. O usuário deve alternar entre “Conversas”, “Chat” e “Contexto”, com título visível, botão de retorno e estado ativo. Em tablet, o contexto pode abrir como drawer, mas deve bloquear apenas o conteúdo necessário e manter um fechamento acessível. O composer deve permanecer fixo, enquanto sugestões e feedback devem ocupar uma área colapsável acima dele.

### 4. Tabelas administrativas: overflow previsível, mas edição difícil

A Auditoria usa o componente `DataTable`, que concentra data/hora, usuário, ação, recurso e status. Esse tipo de tabela precisa de uma política explícita para telas estreitas: rolagem horizontal com indicação visual, coluna de identificação fixa, ou transformação em lista de registros.

As Tabelas de Frete possuem muitas colunas editáveis e representam o risco mais alto de usabilidade em mobile. Mesmo quando a tabela possui rolagem horizontal, a edição célula a célula torna difícil preservar contexto, comparar valores e confirmar alterações.

**Recomendação:** no mobile, trocar a tabela por cards editáveis ou por um formulário de detalhe de uma linha. No desktop, manter a tabela com colunas fixas para transportadora, faixa e região. Alterações devem possuir feedback próximo à célula, estado de salvamento e recuperação clara em caso de erro.

### 5. Command Bar e hierarquia da página

A Command Bar usa `sticky top-3` e reorganiza a busca para uma linha completa em telas menores. O comportamento evita overflow, mas a descrição “Foundation UI (FRONT-01) aplicada ao shell” é detalhe técnico e ocupa espaço em uma área crítica. O controle “Logs” desaparece em telas menores sem uma ação alternativa visível.

**Recomendação:** em smartphones, mostrar título, estado operacional e busca como elementos prioritários. Mover ações secundárias para um menu de overflow. A busca deve ter altura de toque consistente e o placeholder deve ser encurtado para “Buscar no cockpit”.

### 6. Estados de carregamento, erro e vazio

O Cockpit possui componentes de skeleton, empty state e feedback de operações, mas os padrões não são completamente uniformes entre os módulos. Há telas que exibem apenas “Carregando...” e telas que mostram um overlay translúcido durante transições. Essa diferença pode fazer o layout saltar ou deixar o usuário sem saber se a ação está sendo processada.

**Recomendação:** definir um contrato visual comum para cada módulo:

| Estado | Comportamento esperado |
|---|---|
| Carregamento inicial | Skeleton com a mesma geometria aproximada do conteúdo final. |
| Atualização parcial | Conteúdo preservado, indicador discreto e `aria-live`. |
| Erro recuperável | Mensagem curta, request ID quando pertinente e botão “Tentar novamente”. |
| Vazio | Explicação contextual e próximo passo operacional. |
| Ação concluída | Feedback próximo da ação, sem deslocar o layout. |

### 7. Acessibilidade e toque

Os componentes possuem diversos controles iconográficos, mas a auditoria deve confirmar de forma sistemática `aria-label`, foco visível, ordem de tabulação e área mínima de toque. O uso de tooltip como única explicação no desktop não atende touch nem teclado. O menu mobile recente já possui `aria-expanded`, `aria-controls` e overlay de fechamento, mas os drawers internos do Atendimento precisam do mesmo padrão.

**Recomendação:** adicionar testes automatizados de teclado e acessibilidade para Sidebar, menu mobile, drawer de contexto, alteração de status de pedido e filtros. O foco deve ir para o título do drawer ao abrir e retornar ao botão acionador ao fechar.

### 8. Polling e estabilidade visual no Atendimento

A lista de conversas é atualizada a cada 15 segundos e as mensagens a cada 8 segundos. O componente também executa scroll suave para o final sempre que `messages` muda. Isso pode ser correto quando o usuário está acompanhando a conversa ao vivo, mas é intrusivo quando ele está lendo mensagens anteriores.

**Recomendação:** detectar se o usuário está próximo do fim antes de executar scroll automático. Se estiver distante, mostrar “Novas mensagens” sem mover a posição. Pausar o polling quando `document.visibilityState` for `hidden` e aplicar atraso progressivo quando houver erro de rede.

## Matriz de validação recomendada

| Viewport | Áreas prioritárias | Critérios adicionais |
|---:|---|---|
| 320px | Topbar, Dashboard, Atendimento, Pedidos | Nenhum corte de texto essencial, nenhum overflow horizontal acidental, composer utilizável. |
| 375px | Dashboard, Atendimento, filtros | Cards legíveis, botão de contexto identificado, drawer fecha por overlay e Escape. |
| 390px | Pedidos, Auditoria | Alternativa de status por toque, filtros sem compressão excessiva. |
| 430px | Atendimento, Command Bar | Ações importantes visíveis sem depender de tooltip. |
| 768px | Atendimento, tabelas | Transição entre modo mobile e tablet previsível, sem três painéis comprimidos. |
| 1024px | Tabelas, Pedidos, Command Bar | Colunas e filtros preservam contexto, drawer não oculta ações críticas. |
| 1280px | Sidebar expandido, Atendimento | Hover do Sidebar não cobre botões nem altera o scroll da página. |
| 1440px | Dashboard e tabelas | Densidade equilibrada e largura máxima consistente. |
| 1920px | Shell e conteúdo | Não deixar conteúdo excessivamente esticado; preservar largura máxima e alinhamento. |

## Plano de implementação recomendado

A primeira entrega deve adicionar a alternativa de alteração de status em Pedidos e reorganizar o Atendimento em modos explícitos para mobile e tablet. Essas alterações eliminam bloqueios funcionais e reduzem o risco de ações inacessíveis.

A segunda entrega deve revisar o dashboard principal, a Command Bar e os estados de carregamento. O objetivo é reduzir densidade, melhorar a hierarquia e tornar as atualizações parciais compreensíveis.

A terceira entrega deve tratar tabelas administrativas, acessibilidade automatizada e comportamento de polling. Essas mudanças aumentam robustez, mas dependem dos padrões definidos nas duas primeiras etapas.

## Arquivos mais prováveis para a próxima etapa

| Arquivo | Motivo |
|---|---|
| `src/app/(app)/cockpit/orders/orders.client.tsx` | Adicionar alternativa de status por toque e teclado. |
| `src/app/(app)/cockpit/atendimento/atendimento.client.tsx` | Reorganizar modos mobile/tablet e controlar drawers/foco/scroll. |
| `src/app/(app)/cockpit/_components/CockpitOverviewBlock.tsx` | Reduzir densidade e priorizar KPIs. |
| `src/app/(app)/cockpit/_components/command-bar.tsx` | Simplificar hierarquia e ações em mobile. |
| `src/app/(app)/cockpit/carrier-tables/carrier-tables.client.tsx` | Definir edição responsiva para tabela extensa. |
| `src/app/(app)/cockpit/audit/_components/AuditTableClient.tsx` | Validar estratégia de tabela/lista em telas estreitas. |
| `src/ui/components/data-table/*` | Padronizar overflow, paginação, foco e estados. |

## Limitações da auditoria

Esta etapa foi uma auditoria estática baseada no código, nos testes existentes e na documentação do repositório. O ambiente não possuía uma sessão autenticada pronta para executar todos os fluxos do Cockpit em navegador real. Portanto, os achados indicam riscos diretamente observáveis na implementação, mas a priorização final deve ser confirmada com testes visuais autenticados nos nove viewports da matriz.

## Referências

[1]: <../src/app/(app)/cockpit/_components/CockpitOverviewBlock.tsx> "CockpitOverviewBlock"
[2]: <../src/app/(app)/cockpit/orders/orders.client.tsx> "OrdersClient"
[3]: <../src/app/(app)/cockpit/atendimento/atendimento.client.tsx> "AtendimentoClient"
[4]: <../src/app/(app)/cockpit/audit/_components/AuditTableClient.tsx> "AuditTableClient"
[5]: <../src/app/(app)/cockpit/_components/command-bar.tsx> "Cockpit Command Bar"
[6]: <../src/ui/shell/app-nav.tsx> "AppNav"
[7]: <../src/ui/shell/app-shell.tsx> "AppShell"
[8]: ../tests/visual/visual-regression.spec.ts "Visual Regression Tests"
