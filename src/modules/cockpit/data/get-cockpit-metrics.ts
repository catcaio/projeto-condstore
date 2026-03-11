import type { CockpitMetric, CockpitRawData } from './shared';
import { formatNumber } from './shared';

export function getCockpitMetrics(rawData: CockpitRawData): CockpitMetric[] {
    const { metricsSnapshot, routeHints } = rawData.derived;

    return [
        {
            id: 'active-conversations',
            label: 'Conversas ativas',
            value: formatNumber(metricsSnapshot.activeConversationCount),
            helper:
                metricsSnapshot.activeConversationCount > 0
                    ? 'Contatos com atividade real nas ultimas 6h e fila ainda sensivel a backlog.'
                    : 'Sem trafego relevante de conversa nas ultimas 6h.',
            tone: metricsSnapshot.unansweredConversationCount > 0 ? 'warning' : 'success',
            href: routeHints.conversationsHref,
        },
        {
            id: 'orders-processing',
            label: 'Pedidos em processamento',
            value: formatNumber(metricsSnapshot.processingOrderCount),
            helper:
                metricsSnapshot.processingOrderCount > 0
                    ? 'Pedidos fora de status terminal e ainda sob execucao operacional.'
                    : 'Nenhum pedido em esteira operacional agora.',
            tone: metricsSnapshot.pendingOrdersCount > 0 ? 'info' : 'success',
            href: routeHints.ordersHref,
        },
        {
            id: 'simulations-today',
            label: 'Simulacoes de frete hoje',
            value: formatNumber(metricsSnapshot.simulationsToday),
            helper:
                metricsSnapshot.simulationsToday > 0
                    ? 'Cotacoes reais registradas hoje no tenant atual.'
                    : 'Nenhuma simulacao registrada hoje ate o momento.',
            tone: metricsSnapshot.simulationsToday > 0 ? 'success' : 'neutral',
            href: routeHints.logisticsHref,
        },
        {
            id: 'exceptions',
            label: 'Erros e excecoes',
            value: formatNumber(metricsSnapshot.errorsAndExceptions),
            helper:
                metricsSnapshot.errorsAndExceptions > 0
                    ? 'Incidentes ativos, eventos em falha e webhooks com erro nas ultimas 24h.'
                    : 'Nenhuma excecao aberta nas fontes monitoradas.',
            tone: metricsSnapshot.errorsAndExceptions > 0 ? 'critical' : 'success',
            href: routeHints.exceptionsHref,
        },
    ];
}
