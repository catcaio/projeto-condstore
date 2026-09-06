import type { SystemStatusPayload } from '@/app/(app)/cockpit/status/queries';
import type { InternalDiagSnapshot } from '@/infra/diagnostics/internal-diag';

export type CockpitMetric = {
    id: string;
    label: string;
    value: string;
    helper: string;
    tone?: 'neutral' | 'info' | 'success' | 'warning' | 'critical';
    href?: string;
};

export type CockpitAlert = {
    id: string;
    title: string;
    description: string;
    priority: 'critical' | 'warning' | 'info';
    action: string;
    href: string;
};

export type CockpitEvent = {
    id: string;
    timestamp: string;
    type: 'simulacao' | 'mensagem' | 'pedido' | 'webhook' | 'sessao';
    entity: string;
    title: string;
    description: string;
    tone?: 'info' | 'success' | 'warning' | 'critical';
    href?: string;
};

export type WorkItemCategory = 'conversation' | 'freight' | 'order' | 'exception';
export type OperationalThreadStage = 'cliente' | 'atendimento' | 'cotacao' | 'pedido' | 'logistica';

export interface WorkItemCustomer {
    id?: string;
    name?: string;
    phone?: string;
    email?: string;
    organization?: string;
    segment?: string;
}

export interface WorkItemConversation {
    id?: string;
    phoneKey?: string;
    status?: string;
    lastIntent?: string;
    lastActivityAt?: string;
    assignedTo?: string | null;
}

export interface WorkItemQuotation {
    id?: string;
    carrier?: string | null;
    service?: string | null;
    price?: number | string | null;
    status?: string;
    expiresAt?: string;
    itemCount?: number;
}

export interface WorkItemOrder {
    id?: string;
    status?: string;
    total?: number | string | null;
    itemCount?: number;
    createdAt?: string;
    quoteId?: string;
}

export interface WorkItemShipment {
    id?: string;
    carrier?: string | null;
    service?: string | null;
    status?: string;
    trackingCode?: string | null;
    estimatedDelivery?: string | null;
    updatedAt?: string;
}

export interface WorkItemException {
    id?: string;
    type?: string;
    description?: string;
    severity?: 'critical' | 'warning' | 'info';
    provider?: string;
    failedAt?: string;
}

export interface WorkItemAction {
    id: string;
    label: string;
    type: 'api_put' | 'api_post' | 'api_patch' | 'link';
    endpoint?: string;
    href?: string;
    payload?: Record<string, unknown>;
    tone?: 'primary' | 'secondary' | 'danger';
    requiresApprovalToken?: boolean;
}

export interface OperationalThread {
    customer?: WorkItemCustomer;
    conversation?: WorkItemConversation;
    quotation?: WorkItemQuotation;
    order?: WorkItemOrder;
    shipment?: WorkItemShipment;
    exception?: WorkItemException;
    activeStage: OperationalThreadStage;
    blockedStage?: OperationalThreadStage;
    blockReason?: string;
}

export type CockpitActionQueueItem = {
    id: string;
    queue: string;
    entity: string;
    waitingFor: string;
    age: string;
    owner: string;
    priority: 'critical' | 'warning' | 'info';
    status: string;
    href: string;
    category: WorkItemCategory;
    timestamps: {
        createdAt: string;
        updatedAt?: string;
        pendingMinutes?: number;
    };
    customer?: WorkItemCustomer;
    conversation?: WorkItemConversation;
    quotation?: WorkItemQuotation;
    order?: WorkItemOrder;
    shipment?: WorkItemShipment;
    exception?: WorkItemException;
    availableActions: WorkItemAction[];
    operationalThread: OperationalThread;
    /** @deprecated retained for backward compatibility */
    threadContext?: {
        customerId?: string;
        phoneKey?: string;
        orderId?: string;
        freightQuoteId?: string;
        shipmentId?: string;
        stage: OperationalThreadStage;
    };
};

export type SystemStatusItem = {
    id: string;
    label: string;
    status: 'healthy' | 'warning' | 'critical';
    detail: string;
    source?: string;
};

export type CockpitShortcut = {
    id: string;
    label: string;
    description: string;
    href: string;
};

export interface CockpitRequestContext {
    tenantId: string;
    role: string;
    userId: string | null;
    tenantName: string;
    timezone: string;
}

export interface CockpitRouteHints {
    conversationsHref: string;
    ordersHref: string;
    logisticsHref: string;
    exceptionsHref: string;
    simulatorHref: string;
    metricsHref: string;
}

export interface ConversationQueueSnapshot {
    phoneKey: string;
    actorLabel: string;
    lastInboundAt: string | null;
    lastOutboundAt: string | null;
    lastActivityAt: string;
    lastIntent: string;
    pendingMinutes: number;
}

export interface CockpitMetricsSnapshot {
    activeConversationCount: number;
    unansweredConversationCount: number;
    processingOrderCount: number;
    pendingOrdersCount: number;
    simulationsToday: number;
    pendingFreightCount: number;
    errorsAndExceptions: number;
    activeIncidentCount: number;
    failedDomineEventsCount: number;
    failedWebhookEventsCount: number;
    criticalSystemCount: number;
}

export interface CockpitDerivedState {
    metricsSnapshot: CockpitMetricsSnapshot;
    routeHints: CockpitRouteHints;
    unansweredConversations: ConversationQueueSnapshot[];
    pendingOrders: Array<{
        orderId: string;
        status: string;
        updatedAt: string;
        valueLabel: string;
    }>;
    pendingFreight: Array<{
        id: string;
        kind: 'shipment' | 'quote';
        carrier: string | null;
        status: string;
        createdAt: string;
    }>;
}

export interface CockpitRawData {
    context: CockpitRequestContext;
    partialBlocks: string[];
    generatedAt: string;
    diagSnapshot: InternalDiagSnapshot | null;
    systemStatusPayload: SystemStatusPayload | null;
    recentMessages: Array<{
        messageSid: string;
        phoneKey: string;
        actorLabel: string;
        direction: 'inbound' | 'outbound';
        intent: string;
        createdAt: string;
    }>;
    recentSimulations: Array<{
        id: string;
        bestCarrier: string | null;
        bestService: string | null;
        bestPrice: string | null;
        createdAt: string;
    }>;
    recentOrders: Array<{
        orderId: string;
        status: string;
        totals: unknown;
        updatedAt: string;
    }>;
    recentFreightQuotes: Array<{
        correlationId: string;
        bestCarrier: string | null;
        bestPriceCents: number | null;
        bestEtaDays: number | null;
        createdAt: string;
    }>;
    recentShipments: Array<{
        id: string;
        carrier: string;
        service: string;
        status: string;
        trackingCode: string | null;
        createdAt: string;
        updatedAt: string;
    }>;
    recentOperationalEvents: Array<{
        id: string;
        eventType: string;
        eventDomain: string;
        entityId: string | null;
        customerId: string | null;
        createdAt: string;
    }>;
    recentDomineEvents: Array<{
        id: string;
        type: string;
        source: string;
        status: string;
        errorCode: string | null;
        createdAt: string;
    }>;
    activeIncidents: Array<{
        id: string;
        type: string;
        startedAt: string;
        triggeredBy: string;
    }>;
    failedWebhookEvents: Array<{
        id: string;
        provider: string;
        eventType: string;
        receivedAt: string;
    }>;
    derived: CockpitDerivedState;
}

export interface CockpitDataBundle {
    metrics: CockpitMetric[];
    alerts: CockpitAlert[];
    events: CockpitEvent[];
    queue: CockpitActionQueueItem[];
    systemStatus: SystemStatusItem[];
    shortcuts: CockpitShortcut[];
    derived: CockpitDerivedState;
    meta: {
        source: 'real' | 'fallback';
        generatedAt: string;
        partialBlocks: string[];
        fallbackReason?: string;
        tenantId?: string;
    };
}

export function formatIso(date: Date | null | undefined) {
    return date ? date.toISOString() : new Date(0).toISOString();
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

export function readNestedString(record: Record<string, unknown> | null, paths: string[][]): string | null {
    if (!record) {
        return null;
    }

    for (const path of paths) {
        let current: unknown = record;
        for (const segment of path) {
            if (!current || typeof current !== 'object' || !(segment in current)) {
                current = null;
                break;
            }
            current = (current as Record<string, unknown>)[segment];
        }

        if (typeof current === 'string' && current.trim()) {
            return current.trim();
        }
    }

    return null;
}

export function resolveMessageActorLabel(
    rawPayload: string,
    phoneHash: string | null,
    fromPhone: string | null
) {
    const parsed = parseJsonObject(rawPayload);
    const payloadName = readNestedString(parsed, [
        ['ProfileName'],
        ['profileName'],
        ['profile', 'name'],
        ['contacts', '0', 'profile', 'name'],
        ['contacts', '0', 'wa_id'],
    ]);

    if (payloadName) {
        return payloadName;
    }

    if (phoneHash?.trim()) {
        return `Contato ${phoneHash.slice(0, 6)}`;
    }

    if (fromPhone?.trim() && fromPhone !== '[redacted]') {
        return `Contato ${fromPhone.slice(-4)}`;
    }

    return 'Contato sem identificacao';
}

export function formatRelativeTime(dateInput: string | Date, now: Date = new Date()) {
    const value = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const diffMs = Math.max(0, now.getTime() - value.getTime());
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) {
        return 'Agora';
    }
    if (diffMinutes < 60) {
        return `${diffMinutes} min`;
    }

    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    if (diffHours < 24) {
        return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m` : `${diffHours}h`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return diffDays === 1 ? '1 dia' : `${diffDays} dias`;
}

export function formatNumber(value: number) {
    return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatCurrency(value: number | null) {
    if (value === null || Number.isNaN(value)) {
        return 'Valor nao informado';
    }

    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
    }).format(value);
}

export function humanizeIntent(intent: string | null | undefined) {
    const normalized = (intent ?? '').trim().toLowerCase();
    if (!normalized || normalized === 'unknown') {
        return 'contexto comercial';
    }

    return normalized.replace(/[_-]+/g, ' ');
}

export function shortId(value: string) {
    return value.length > 10 ? value.slice(0, 8) : value;
}

export function toLowerText(value: string | null | undefined) {
    return (value ?? '').trim().toLowerCase();
}

export function isTerminalOrderStatus(status: string) {
    const normalized = toLowerText(status);
    return [
        'concluido',
        'completed',
        'cancelado',
        'cancelled',
        'canceled',
        'entregue',
    ].some((terminalStatus) => normalized.includes(terminalStatus));
}

export function toCanonicalOrderStatus(status: string) {
    const normalized = toLowerText(status);
    if (normalized.includes('anal')) return 'em-analise';
    if (normalized.includes('aprov')) return 'aprovado';
    if (normalized.includes('fatur')) return 'faturado';
    if (normalized.includes('exped')) return 'expedido';
    if (normalized.includes('concl') || normalized.includes('entreg')) return 'concluido';
    if (normalized.includes('exce') || normalized.includes('erro')) return 'excecao';
    return 'recebido';
}

export function toCanonicalLogisticsStatus(status: string) {
    const normalized = toLowerText(status);
    if (normalized.includes('aprov')) return 'aguardando-aprovacao';
    if (normalized.includes('colet')) return 'coletado';
    if (normalized.includes('transit')) return 'em-transito';
    if (normalized.includes('entreg')) return 'entregue';
    if (normalized.includes('atras')) return 'atrasado';
    if (normalized.includes('exce') || normalized.includes('erro')) return 'excecao';
    return 'simulado';
}

export function extractOrderValue(totals: unknown) {
    if (!totals || typeof totals !== 'object') {
        return null;
    }

    const candidates = [
        'total',
        'grandTotal',
        'totalAmount',
        'amount',
        'subtotal',
        'totalCents',
        'grandTotalCents',
    ];

    for (const key of candidates) {
        const rawValue = (totals as Record<string, unknown>)[key];
        if (typeof rawValue === 'number' && Number.isFinite(rawValue)) {
            return key.toLowerCase().includes('cents') ? rawValue / 100 : rawValue;
        }
        if (typeof rawValue === 'string') {
            const parsed = Number(rawValue);
            if (Number.isFinite(parsed)) {
                return key.toLowerCase().includes('cents') ? parsed / 100 : parsed;
            }
        }
    }

    return null;
}
