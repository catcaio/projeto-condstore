import type { CockpitActionQueueItem, CockpitRawData } from './shared';
import {
    formatRelativeTime,
    humanizeIntent,
    toCanonicalLogisticsStatus,
    toCanonicalOrderStatus,
} from './shared';

function resolveConversationPriority(minutes: number): CockpitActionQueueItem['priority'] {
    if (minutes >= 45) {
        return 'critical';
    }
    if (minutes >= 20) {
        return 'warning';
    }
    return 'info';
}

function resolveOrderWaitingFor(status: string) {
    const normalized = status.toLowerCase();
    if (normalized.includes('anal')) return 'Liberacao comercial';
    if (normalized.includes('aprov')) return 'Handoff para faturamento';
    if (normalized.includes('fatur')) return 'Expedicao';
    if (normalized.includes('exped')) return 'Confirmacao logistica';
    if (normalized.includes('exce') || normalized.includes('erro')) return 'Tratativa de excecao';
    return 'Validacao inicial';
}

function resolveFreightWaitingFor(status: string) {
    const normalized = status.toLowerCase();
    if (normalized.includes('aprov')) return 'Escolha de transportadora';
    if (normalized.includes('transit')) return 'Acompanhamento de entrega';
    if (normalized.includes('atras')) return 'Contingencia de SLA';
    if (normalized.includes('exce') || normalized.includes('erro')) return 'Intervencao humana';
    return 'Aprovacao logistica';
}

export function getCockpitQueues(rawData: CockpitRawData): CockpitActionQueueItem[] {
    const conversationRows: CockpitActionQueueItem[] = rawData.derived.unansweredConversations.slice(0, 4).map((conversation) => ({
        id: `queue-conversation-${conversation.phoneKey}`,
        queue: 'Conversas sem resposta',
        entity: conversation.actorLabel,
        waitingFor: `Resposta sobre ${humanizeIntent(conversation.lastIntent)}`,
        age: formatRelativeTime(conversation.lastInboundAt ?? conversation.lastActivityAt),
        owner: 'CX Ops',
        priority: resolveConversationPriority(conversation.pendingMinutes),
        href: rawData.derived.routeHints.conversationsHref,
        category: 'conversation' as const,
        threadContext: {
            phoneKey: conversation.phoneKey,
            stage: 'atendimento' as const,
        },
    }));

    const orderRows: CockpitActionQueueItem[] = rawData.derived.pendingOrders.slice(0, 3).map((order) => ({
        id: `queue-order-${order.orderId}`,
        queue: 'Pedidos aguardando acao',
        entity: `Pedido #${order.orderId}`,
        waitingFor: resolveOrderWaitingFor(order.status),
        age: formatRelativeTime(order.updatedAt),
        owner: 'Sales Ops',
        priority:
            new Date(order.updatedAt).getTime() < Date.now() - 60 * 60 * 1000
                ? 'warning'
                : 'info',
        href: `/pedidos?status=${toCanonicalOrderStatus(order.status)}`,
        category: 'order' as const,
        threadContext: {
            orderId: order.orderId,
            stage: 'pedido' as const,
        },
    }));

    const freightRows: CockpitActionQueueItem[] = rawData.derived.pendingFreight.slice(0, 3).map((freight) => ({
        id: `queue-freight-${freight.id}`,
        queue:
            freight.kind === 'shipment'
                ? 'Logistica em acompanhamento'
                : 'Simulacoes pendentes',
        entity:
            freight.kind === 'shipment'
                ? `Tracking ${freight.id.slice(0, 8)}`
                : `Cotacao ${freight.id.slice(0, 8)}`,
        waitingFor: resolveFreightWaitingFor(freight.status),
        age: formatRelativeTime(freight.createdAt),
        owner: 'Freight Ops',
        priority:
            freight.status.toLowerCase().includes('atras') ||
            freight.status.toLowerCase().includes('exce')
                ? 'critical'
                : 'info',
        href: `/logistica?status=${toCanonicalLogisticsStatus(freight.status)}`,
        category: freight.status.toLowerCase().includes('exce') ? ('exception' as const) : ('freight' as const),
        threadContext: {
            freightQuoteId: freight.kind === 'quote' ? freight.id : undefined,
            shipmentId: freight.kind === 'shipment' ? freight.id : undefined,
            stage: freight.kind === 'shipment' ? ('logistica' as const) : ('cotacao' as const),
        },
    }));

    return [...conversationRows, ...orderRows, ...freightRows];
}
