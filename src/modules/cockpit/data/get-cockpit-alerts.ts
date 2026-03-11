import type {
    CockpitAlert,
    CockpitMetricsSnapshot,
    CockpitRouteHints,
    SystemStatusItem,
} from './shared';

export interface CockpitAlertInput {
    metricsSnapshot: CockpitMetricsSnapshot;
    routeHints: CockpitRouteHints;
    systemStatus: SystemStatusItem[];
}

export function buildCockpitAlerts({
    metricsSnapshot,
    routeHints,
    systemStatus,
}: CockpitAlertInput): CockpitAlert[] {
    const alerts: CockpitAlert[] = [];
    const criticalSystemItem = systemStatus.find((item) => item.status === 'critical');
    const warningSystemItem = systemStatus.find((item) => item.status === 'warning');

    if (criticalSystemItem) {
        alerts.push({
            id: 'integration-failure',
            title: `Falha critica em ${criticalSystemItem.label}`,
            description: criticalSystemItem.detail,
            priority: 'critical',
            action: 'Verificar integracao',
            href:
                criticalSystemItem.id === 'webhook'
                    ? routeHints.exceptionsHref
                    : '/configuracoes',
        });
    } else if (warningSystemItem) {
        alerts.push({
            id: 'integration-warning',
            title: `${warningSystemItem.label} exige observacao`,
            description: warningSystemItem.detail,
            priority: 'warning',
            action: 'Abrir status',
            href:
                warningSystemItem.id === 'webhook'
                    ? routeHints.exceptionsHref
                    : '/configuracoes',
        });
    }

    if (metricsSnapshot.pendingOrdersCount > 0) {
        alerts.push({
            id: 'stuck-orders',
            title: 'Pedidos travados na esteira operacional',
            description: `${metricsSnapshot.pendingOrdersCount} pedido(s) seguem fora de status terminal e ainda exigem acao humana.`,
            priority: metricsSnapshot.pendingOrdersCount >= 10 ? 'critical' : 'warning',
            action: 'Abrir pedidos',
            href: routeHints.ordersHref,
        });
    }

    if (metricsSnapshot.failedDomineEventsCount > 0 || metricsSnapshot.pendingFreightCount > 0) {
        alerts.push({
            id: 'simulation-error',
            title: 'Logistica e simulacao pedem contingencia',
            description:
                metricsSnapshot.failedDomineEventsCount > 0
                    ? `${metricsSnapshot.failedDomineEventsCount} evento(s) de dominio falharam nas ultimas 24h.`
                    : `${metricsSnapshot.pendingFreightCount} item(ns) logisticos seguem sem conclusao.`,
            priority: metricsSnapshot.failedDomineEventsCount > 0 ? 'critical' : 'warning',
            action: 'Revisar logistica',
            href: routeHints.exceptionsHref,
        });
    }

    if (metricsSnapshot.unansweredConversationCount > 0) {
        alerts.push({
            id: 'conversation-backlog',
            title: 'Backlog alto de conversas sem resposta',
            description: `${metricsSnapshot.unansweredConversationCount} conversa(s) ficaram com ultimo toque do cliente e ainda nao receberam retorno.`,
            priority: metricsSnapshot.unansweredConversationCount >= 8 ? 'warning' : 'info',
            action: 'Abrir conversas',
            href: routeHints.conversationsHref,
        });
    }

    if (alerts.length === 0) {
        return [
            {
                id: 'no-critical-alerts',
                title: 'Sem alertas criticos abertos',
                description: 'As fontes reais conectadas ao cockpit nao encontraram gargalo imediato neste momento.',
                priority: 'info',
                action: 'Ver metricas',
                href: routeHints.metricsHref,
            },
        ];
    }

    return alerts.slice(0, 4);
}

export function getCockpitAlerts(
    metricsSnapshot: CockpitMetricsSnapshot,
    routeHints: CockpitRouteHints,
    systemStatus: SystemStatusItem[]
) {
    return buildCockpitAlerts({
        metricsSnapshot,
        routeHints,
        systemStatus,
    });
}
