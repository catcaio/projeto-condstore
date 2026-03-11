import type { CockpitEvent, CockpitRawData } from './shared';
import {
    formatCurrency,
    formatRelativeTime,
    humanizeIntent,
    shortId,
    toCanonicalLogisticsStatus,
    toCanonicalOrderStatus,
    toLowerText,
} from './shared';

type FeedItem = CockpitEvent & { sortAt: string };

function mapOperationalEventType(eventType: string, eventDomain: string): CockpitEvent['type'] {
    const normalizedType = toLowerText(eventType);
    const normalizedDomain = toLowerText(eventDomain);

    if (
        normalizedType.includes('message') ||
        normalizedType.includes('conversation') ||
        normalizedDomain.includes('operations')
    ) {
        return 'mensagem';
    }
    if (normalizedType.includes('quote') || normalizedType.includes('freight')) {
        return 'simulacao';
    }
    if (normalizedType.includes('order') || normalizedType.includes('pedido')) {
        return 'pedido';
    }
    if (normalizedType.includes('session')) {
        return 'sessao';
    }

    return 'sessao';
}

function prettifyEventType(value: string) {
    return value
        .replace(/[_-]+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCockpitEvents(rawData: CockpitRawData): CockpitEvent[] {
    const messageEvents: FeedItem[] = rawData.recentMessages.slice(0, 4).map((message) => ({
        id: `message-${message.messageSid}`,
        timestamp: formatRelativeTime(message.createdAt),
        type: 'mensagem',
        entity: message.actorLabel,
        title: message.direction === 'inbound' ? 'Mensagem recebida' : 'Resposta enviada',
        description:
            message.direction === 'inbound'
                ? `Contato acionou a operacao com foco em ${humanizeIntent(message.intent)}.`
                : `Atendimento respondeu em cima de ${humanizeIntent(message.intent)}.`,
        tone: message.direction === 'inbound' ? 'warning' : 'info',
        href: rawData.derived.routeHints.conversationsHref,
        sortAt: message.createdAt,
    }));

    const simulationEvents: FeedItem[] = rawData.recentSimulations.slice(0, 3).map((simulation) => ({
        id: `simulation-${simulation.id}`,
        timestamp: formatRelativeTime(simulation.createdAt),
        type: 'simulacao',
        entity: `Simulacao ${shortId(simulation.id)}`,
        title: 'Nova simulacao criada',
        description: `${simulation.bestCarrier ?? 'Carrier nao informado'} com ${formatCurrency(simulation.bestPrice ? Number(simulation.bestPrice) : null)}.`,
        tone: 'info',
        href: rawData.derived.routeHints.logisticsHref,
        sortAt: simulation.createdAt,
    }));

    const orderEvents: FeedItem[] = rawData.recentOrders.slice(0, 3).map((order) => ({
        id: `order-${order.orderId}`,
        timestamp: formatRelativeTime(order.updatedAt),
        type: 'pedido',
        entity: `Pedido #${order.orderId}`,
        title: 'Pedido atualizado',
        description: `Status operacional em ${order.status}.`,
        tone: order.status.toLowerCase().includes('aprov') ? 'success' : 'info',
        href: `/pedidos?status=${toCanonicalOrderStatus(order.status)}`,
        sortAt: order.updatedAt,
    }));

    const webhookRows: FeedItem[] = rawData.failedWebhookEvents.slice(0, 2).map((webhook) => ({
        id: `webhook-${webhook.id}`,
        timestamp: formatRelativeTime(webhook.receivedAt),
        type: 'webhook',
        entity: webhook.provider,
        title: 'Webhook com falha',
        description: `${webhook.provider} retornou erro em ${webhook.eventType}.`,
        tone: 'critical',
        href: rawData.derived.routeHints.exceptionsHref,
        sortAt: webhook.receivedAt,
    }));

    const domineRows: FeedItem[] = rawData.recentDomineEvents.slice(0, 2).map((eventRow) => ({
        id: `domine-${eventRow.id}`,
        timestamp: formatRelativeTime(eventRow.createdAt),
        type: eventRow.type.toLowerCase().includes('freight') ? 'simulacao' : 'sessao',
        entity: prettifyEventType(eventRow.source),
        title:
            eventRow.status === 'dead_letter'
                ? 'Evento movido para DLQ'
                : eventRow.status === 'failed'
                  ? 'Evento em retry'
                  : 'Evento processado',
        description: `${prettifyEventType(eventRow.type)} em estado ${eventRow.status}.`,
        tone:
            eventRow.status === 'dead_letter'
                ? 'critical'
                : eventRow.status === 'failed'
                  ? 'warning'
                  : 'info',
        href:
            eventRow.type.toLowerCase().includes('freight')
                ? rawData.derived.routeHints.logisticsHref
                : rawData.derived.routeHints.ordersHref,
        sortAt: eventRow.createdAt,
    }));

    const operationalRows: FeedItem[] = rawData.recentOperationalEvents.slice(0, 3).map((eventRow) => {
        const mappedType = mapOperationalEventType(eventRow.eventType, eventRow.eventDomain);
        const href =
            mappedType === 'pedido'
                ? rawData.derived.routeHints.ordersHref
                : mappedType === 'simulacao'
                  ? `/logistica?status=${toCanonicalLogisticsStatus(eventRow.eventType)}`
                  : rawData.derived.routeHints.conversationsHref;

        return {
            id: `op-${eventRow.id}`,
            timestamp: formatRelativeTime(eventRow.createdAt),
            type: mappedType,
            entity: eventRow.entityId ?? eventRow.customerId ?? prettifyEventType(eventRow.eventDomain),
            title: prettifyEventType(eventRow.eventType),
            description: `Evento operacional registrado no dominio ${eventRow.eventDomain}.`,
            tone: mappedType === 'pedido' ? 'success' : 'info',
            href,
            sortAt: eventRow.createdAt,
        };
    });

    return [
        ...messageEvents,
        ...simulationEvents,
        ...orderEvents,
        ...webhookRows,
        ...domineRows,
        ...operationalRows,
    ]
        .sort((left, right) => new Date(right.sortAt).getTime() - new Date(left.sortAt).getTime())
        .slice(0, 10)
        .map(({ sortAt: _sortAt, ...event }) => event);
}
