import type {
    CockpitActionQueueItem,
    OperationalThreadStage,
    WorkItemAction,
    WorkItemCategory,
    WorkItemConversation,
    WorkItemCustomer,
    WorkItemException,
    WorkItemOrder,
    WorkItemQuotation,
    WorkItemShipment,
} from '../../data/shared';

export interface FrankOperationalContext {
    tenantId: string;
    activeWorkItemId: string | null;
    category: WorkItemCategory | null;
    priority: string | null;
    customer: WorkItemCustomer | null;
    conversation: WorkItemConversation | null;
    quotation: WorkItemQuotation | null;
    order: WorkItemOrder | null;
    shipment: WorkItemShipment | null;
    exception: WorkItemException | null;
    activeStage: OperationalThreadStage | null;
    blockedStage?: OperationalThreadStage | null;
    blockReason?: string | null;
    availableActions: Array<{
        id: string;
        label: string;
    }>;
}

export function buildFrankOperationalContext(
    item: CockpitActionQueueItem | null,
    tenantId: string
): FrankOperationalContext {
    if (!item) {
        return {
            tenantId,
            activeWorkItemId: null,
            category: null,
            priority: null,
            customer: null,
            conversation: null,
            quotation: null,
            order: null,
            shipment: null,
            exception: null,
            activeStage: null,
            blockedStage: null,
            blockReason: null,
            availableActions: [],
        };
    }

    const thread = item.operationalThread;

    return {
        tenantId,
        activeWorkItemId: item.id,
        category: item.category,
        priority: item.priority,
        customer: thread.customer ?? item.customer ?? null,
        conversation: thread.conversation ?? item.conversation ?? null,
        quotation: thread.quotation ?? item.quotation ?? null,
        order: thread.order ?? item.order ?? null,
        shipment: thread.shipment ?? item.shipment ?? null,
        exception: thread.exception ?? item.exception ?? null,
        activeStage: thread.activeStage ?? 'atendimento',
        blockedStage: thread.blockedStage ?? null,
        blockReason: thread.blockReason ?? null,
        availableActions: (item.availableActions ?? []).map((action: WorkItemAction) => ({
            id: action.id,
            label: action.label,
        })),
    };
}
