# Cockpit Governance: O Padrão Operacional Lojacond

Este documento estabelece as regras para o design e engenharia do Cockpit da Lojacond. O Cockpit não é uma interface administrativa genérica ("software as a service panopticon"), é um **Centro de Comando Operacional** em tempo real. Qualquer tela, rota ou dado injetado aqui deve seguir estritamente as diretrizes abaixo.

## 1. Zero "Telas Decorativas" e Zero Mocks Encobertos
Nenhuma página deve ser aprovada para o Cockpit se for apenas "informativa" de forma estática ou composta por dados falsos (mocks) disfarçados de relatórios reais.
- **Transparência de Mocks:** Se um módulo não possuir backend conectado e for inserido como visão conceitual de futuro, ele DEVE declarar explicitamente "Atualmente Operando com Dados Simulados" via badge ou warning visível e inamovível.
- **Estados Vazios Operacionais:** Se não houver dado legítimo vindo do banco (ex: logística sem tracking nativo), a tela renderiza estado de "Fila Vazia" verdadeiro, guiando o operador para a próxima ação de sistema (ver clientes, abrir simulação). Telas não inventam números.

## 2. Ação Imediata (Actionability over Dashboarding)
O operador não entra no Cockpit para admirar gráficos. Ele entra para "limpar a fila".
Qualquer tela primária deve responder visualmente:
- "O que está quebrando agora?"
- "Qual o gargalo?"
- "Onde clico para resolver?"

**Regra:** Telas vitais (Conversas, Pedidos, Clientes, Logística) devem usar o **Enterprise Premium 3-Pane Layout**, mantendo a "Fila", os "Detalhes" e o "Contexto Adicional" na mesma viewport.

## 3. Desempenho e Vida Útil (Anti-Flicker e Estabilidade no Rerender)
- **Proibição de Polling Agressivo Destrutivo:** `setInterval` simples que reseta estado e destrói o layout (flickering de scroll/avatares) é banido. O recarregamento de dados no cliente _deve_ ser feito de forma tolerante a falhas (via SWR ou React Query) mantendo os dados "stale" enquanto renova por baixo dos panos.
- **Minimização de Layout Shifts:** Elementos de UI não devem "pular" quando novas mensagens/dados chegam. Estruturas devem ser limitadas por `min-w-0` e flexbox ancorado. Panejamentos horizontais infinitos causando overflow são inaceitáveis.

## 4. O Sistema é Centrado no Frank (Assistente Ubíquo)
O Frank não é um robô de chatbot isolado; ele é o "Supervisor Sistêmico". 
- Ele deve estar acessível de **qualquer tela** do ecossistema.
- Ele deve ser capaz de traduzir atualizações do sistema (change log) e contextualizar impacto (ex: "Acabamos de dar deploy na integração de boletos, o módulo de Pedidos agora envia cobranças automaticamente").

## 5. Hierarquia (Lojacond First)
O workspace reflete as necessidades vitais da Lojacond. A barra lateral (sidebar) deve destacar no topo apenas os fluxos de dinheiro, serviço e entrega:
1. Cockpit (Visal Geral Viva)
2. Atendimento/Conversas (Serviço Inbound)
3. Pedidos (Transação)
4. Logística (Serviço Outbound)
5. Clientes (CRM Operacional)

Todos os demais módulos de infraestrutura, playbooks e configurações devem ser agrupados no final da lista, fora do caminho visual primário.

---
**Status:** ATIVO
**Revisão:** Fase 4 - Saneamento Funcional (Cockpit Lojacond)
