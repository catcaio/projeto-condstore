import type { CockpitRawData, CockpitShortcut } from './shared';

export function getCockpitShortcuts(rawData: CockpitRawData): CockpitShortcut[] {
    const { routeHints, metricsSnapshot } = rawData.derived;

    return [
        {
            id: 'new-simulation',
            label: 'Nova simulacao',
            description:
                metricsSnapshot.pendingFreightCount > 0
                    ? 'Abrir o simulador ja no fluxo de contingencia operacional.'
                    : 'Abrir o simulador de frete com o contexto do tenant atual.',
            href: routeHints.simulatorHref,
        },
        {
            id: 'open-conversations',
            label: 'Abrir conversas',
            description:
                metricsSnapshot.unansweredConversationCount > 0
                    ? 'Ir direto para a fila com backlog real de atendimento.'
                    : 'Entrar na inbox canonica sem perder o contexto do cockpit.',
            href: routeHints.conversationsHref,
        },
        {
            id: 'create-order',
            label: 'Criar pedido',
            description:
                metricsSnapshot.pendingOrdersCount > 0
                    ? 'Entrar na fila de pedidos e agir no ponto de maior atrito.'
                    : 'Acessar a esteira canonica de pedidos.',
            href: routeHints.ordersHref,
        },
        {
            id: 'view-metrics',
            label: 'Ver metricas',
            description: 'Abrir a leitura executiva mantendo a espinha dorsal operacional.',
            href: routeHints.metricsHref,
        },
    ];
}
