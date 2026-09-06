import type {
    CockpitActionQueueItem,
    CockpitRawData,
    WorkItemAction,
    WorkItemConversation,
    WorkItemCustomer,
    WorkItemException,
    WorkItemOrder,
    WorkItemQuotation,
    WorkItemShipment,
} from './shared';
import {
    extractOrderValue,
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
    const now = new Date();

    // 1. Conversations Queue Items
    const conversationRows: CockpitActionQueueItem[] = rawData.derived.unansweredConversations
        .slice(0, 5)
        .map((conversation) => {
            const createdAtIso = conversation.lastInboundAt ?? conversation.lastActivityAt;
            const customer: WorkItemCustomer = {
                phone: conversation.phoneKey,
                name: conversation.actorLabel,
            };
            const conversationItem: WorkItemConversation = {
                phoneKey: conversation.phoneKey,
                status: 'UNANSWERED',
                lastIntent: conversation.lastIntent,
                lastActivityAt: conversation.lastActivityAt,
            };

            const quotation: WorkItemQuotation | undefined = undefined;
            const order: WorkItemOrder | undefined = undefined;
            const shipment: WorkItemShipment | undefined = undefined;

            const availableActions: WorkItemAction[] = [
                {
                    id: 'assign_operator',
                    label: 'Assumir Atendimento',
                    type: 'api_put',
                    endpoint: `/api/cockpit/conversations/${conversation.phoneKey}/assign`,
                    tone: 'primary',
                },
                {
                    id: 'open_conversations',
                    label: 'Continuar Atendimento',
                    type: 'link',
                    href: rawData.derived.routeHints.conversationsHref,
                    tone: 'secondary',
                },
            ];

            return {
                id: `queue-conversation-${conversation.phoneKey}`,
                queue: 'Conversas sem resposta',
                entity: conversation.actorLabel,
                waitingFor: `Resposta sobre ${humanizeIntent(conversation.lastIntent)}`,
                age: formatRelativeTime(createdAtIso, now),
                owner: 'CX Ops',
                priority: resolveConversationPriority(conversation.pendingMinutes),
                status: 'UNANSWERED',
                href: rawData.derived.routeHints.conversationsHref,
                category: 'conversation' as const,
                timestamps: {
                    createdAt: createdAtIso,
                    pendingMinutes: conversation.pendingMinutes,
                },
                customer,
                conversation: conversationItem,
                quotation,
                order,
                shipment,
                availableActions,
                operationalThread: {
                    customer,
                    conversation: conversationItem,
                    quotation,
                    order,
                    shipment,
                    activeStage: 'atendimento' as const,
                    blockedStage: 'atendimento' as const,
                    blockReason: `Aguardando resposta do operador (${conversation.pendingMinutes} min em fila)`,
                },
                threadContext: {
                    phoneKey: conversation.phoneKey,
                    stage: 'atendimento' as const,
                },
            };
        });

    // 2. Orders Queue Items
    const orderRows: CockpitActionQueueItem[] = rawData.derived.pendingOrders.slice(0, 4).map((order) => {
        const matchingRawOrder = rawData.recentOrders.find((o) => o.orderId === order.orderId);
        const orderTotal = extractOrderValue(matchingRawOrder?.totals);
        const orderItem: WorkItemOrder = {
            id: order.orderId,
            status: order.status,
            total: orderTotal,
            createdAt: order.updatedAt,
        };

        const matchingShipment = rawData.recentShipments.find((s) => s.id.includes(order.orderId));
        const shipment: WorkItemShipment | undefined = matchingShipment
            ? {
                  id: matchingShipment.id,
                  carrier: matchingShipment.carrier,
                  service: matchingShipment.service,
                  status: matchingShipment.status,
                  trackingCode: matchingShipment.trackingCode,
              }
            : undefined;

        const isException = order.status.toLowerCase().includes('exce') || order.status.toLowerCase().includes('erro');
        const availableActions: WorkItemAction[] = [
            {
                id: 'advance_status',
                label: 'Avançar Status do Pedido',
                type: 'api_patch',
                endpoint: `/api/cockpit/orders/${order.orderId}/status`,
                tone: 'primary',
            },
            {
                id: 'open_order_details',
                label: 'Abrir Pedido Completo',
                type: 'link',
                href: `/pedidos?status=${toCanonicalOrderStatus(order.status)}`,
                tone: 'secondary',
            },
        ];

        return {
            id: `queue-order-${order.orderId}`,
            queue: 'Pedidos aguardando acao',
            entity: `Pedido #${order.orderId}`,
            waitingFor: resolveOrderWaitingFor(order.status),
            age: formatRelativeTime(order.updatedAt, now),
            owner: 'Sales Ops',
            priority: isException
                ? 'critical'
                : new Date(order.updatedAt).getTime() < now.getTime() - 60 * 60 * 1000
                ? 'warning'
                : 'info',
            status: order.status,
            href: `/pedidos?status=${toCanonicalOrderStatus(order.status)}`,
            category: isException ? ('exception' as const) : ('order' as const),
            timestamps: {
                createdAt: order.updatedAt,
                updatedAt: order.updatedAt,
            },
            order: orderItem,
            shipment,
            availableActions,
            operationalThread: {
                order: orderItem,
                shipment,
                activeStage: 'pedido' as const,
                blockedStage: order.status.toLowerCase().includes('anal') || isException ? ('pedido' as const) : undefined,
                blockReason: resolveOrderWaitingFor(order.status),
            },
            threadContext: {
                orderId: order.orderId,
                stage: 'pedido' as const,
            },
        };
    });

    // 3. Freight Queue Items
    const freightRows: CockpitActionQueueItem[] = rawData.derived.pendingFreight.slice(0, 4).map((freight) => {
        const isShipment = freight.kind === 'shipment';
        const isException = freight.status.toLowerCase().includes('atras') || freight.status.toLowerCase().includes('exce');

        const quotation: WorkItemQuotation | undefined = !isShipment
            ? {
                  id: freight.id,
                  carrier: freight.carrier,
                  status: freight.status,
              }
            : undefined;

        const shipment: WorkItemShipment | undefined = isShipment
            ? {
                  id: freight.id,
                  carrier: freight.carrier,
                  status: freight.status,
              }
            : undefined;

        const availableActions: WorkItemAction[] = [
            {
                id: 'view_logistics',
                label: isShipment ? 'Acompanhar Logística' : 'Inspecionar Cotação',
                type: 'link',
                href: `/logistica?status=${toCanonicalLogisticsStatus(freight.status)}`,
                tone: 'primary',
            },
        ];

        return {
            id: `queue-freight-${freight.id}`,
            queue: isShipment ? 'Logistica em acompanhamento' : 'Simulacoes pendentes',
            entity: isShipment ? `Tracking ${freight.id.slice(0, 8)}` : `Cotacao ${freight.id.slice(0, 8)}`,
            waitingFor: resolveFreightWaitingFor(freight.status),
            age: formatRelativeTime(freight.createdAt, now),
            owner: 'Freight Ops',
            priority: isException ? 'critical' : 'info',
            status: freight.status,
            href: `/logistica?status=${toCanonicalLogisticsStatus(freight.status)}`,
            category: isException ? ('exception' as const) : ('freight' as const),
            timestamps: {
                createdAt: freight.createdAt,
            },
            quotation,
            shipment,
            availableActions,
            operationalThread: {
                quotation,
                shipment,
                activeStage: isShipment ? ('logistica' as const) : ('cotacao' as const),
                blockedStage: isException ? (isShipment ? ('logistica' as const) : ('cotacao' as const)) : undefined,
                blockReason: resolveFreightWaitingFor(freight.status),
            },
            threadContext: {
                freightQuoteId: !isShipment ? freight.id : undefined,
                shipmentId: isShipment ? freight.id : undefined,
                stage: isShipment ? ('logistica' as const) : ('cotacao' as const),
            },
        };
    });

    // 4. Incident / Webhook Exception Queue Items
    const exceptionRows: CockpitActionQueueItem[] = [];
    if (rawData.failedWebhookEvents.length > 0 || rawData.activeIncidents.length > 0) {
        rawData.activeIncidents.slice(0, 2).forEach((incident) => {
            const exceptionItem: WorkItemException = {
                id: incident.id,
                type: incident.type,
                description: `Incidente ativo acionado por ${incident.triggeredBy}`,
                severity: 'critical',
                failedAt: incident.startedAt,
            };

            exceptionRows.push({
                id: `queue-exception-incident-${incident.id}`,
                queue: 'Exceções Críticas de Sistema',
                entity: `Incidente: ${incident.type}`,
                waitingFor: 'Intervenção técnica / Ops',
                age: formatRelativeTime(incident.startedAt, now),
                owner: 'DevOps',
                priority: 'critical',
                status: 'ACTIVE_INCIDENT',
                href: rawData.derived.routeHints.exceptionsHref,
                category: 'exception',
                timestamps: {
                    createdAt: incident.startedAt,
                },
                exception: exceptionItem,
                availableActions: [
                    {
                        id: 'inspect_exception',
                        label: 'Inspecionar Erro',
                        type: 'link',
                        href: rawData.derived.routeHints.exceptionsHref,
                        tone: 'danger',
                    },
                ],
                operationalThread: {
                    exception: exceptionItem,
                    activeStage: 'logistica',
                    blockedStage: 'logistica',
                    blockReason: `Incidente crítico: ${incident.type}`,
                },
                threadContext: {
                    stage: 'logistica',
                },
            });
        });
    }

    return [...exceptionRows, ...conversationRows, ...orderRows, ...freightRows];
}
