import { headers } from 'next/headers';
import { and, desc, eq, gte, isNull, sql } from 'drizzle-orm';
import type { SystemStatusPayload } from '@/app/(app)/cockpit/status/queries';
import { getSystemStatus } from '@/app/(app)/cockpit/status/queries';
import {
    domineEvents,
    domineFreightQuotes,
    domineOrders,
    freightShipments,
    messages,
    operationalEvents,
    simulations,
    tenantIncidents,
    webhookEvents,
} from '@/drizzle/schema';
import type { InternalDiagSnapshot } from '@/infra/diagnostics/internal-diag';
import { collectInternalDiagSnapshot } from '@/infra/diagnostics/internal-diag';
import { getDb, withTenantNotDeleted } from '@/infra/db';
import { simulationRepository } from '@/infra/repositories/simulation.repository';
import { tenantRepository } from '@/infra/repositories/tenant.repository';

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

export type CockpitActionQueueItem = {
    id: string;
    queue: string;
    entity: string;
    waitingFor: string;
    age: string;
    owner: string;
    priority: 'critical' | 'warning' | 'info';
    href: string;
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

function formatIso(date: Date | null | undefined) {
    return date ? date.toISOString() : new Date(0).toISOString();
}

function parseJsonObject(value: string): Record<string, unknown> | null {
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

function readNestedString(record: Record<string, unknown> | null, paths: string[][]): string | null {
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

function resolveMessageActorLabel(
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

function buildConversationSnapshots(
    recentMessages: CockpitRawData['recentMessages'],
    now: Date
) {
    const byPhone = new Map<string, ConversationQueueSnapshot>();

    for (const message of recentMessages) {
        const current = byPhone.get(message.phoneKey);
        const createdAtDate = new Date(message.createdAt);

        if (!current) {
            byPhone.set(message.phoneKey, {
                phoneKey: message.phoneKey,
                actorLabel: message.actorLabel,
                lastInboundAt: message.direction === 'inbound' ? message.createdAt : null,
                lastOutboundAt: message.direction === 'outbound' ? message.createdAt : null,
                lastActivityAt: message.createdAt,
                lastIntent: message.intent,
                pendingMinutes:
                    message.direction === 'inbound'
                        ? Math.floor((now.getTime() - createdAtDate.getTime()) / 60000)
                        : 0,
            });
            continue;
        }

        if (new Date(current.lastActivityAt).getTime() < createdAtDate.getTime()) {
            current.lastActivityAt = message.createdAt;
            current.actorLabel = message.actorLabel || current.actorLabel;
            current.lastIntent = message.intent || current.lastIntent;
        }

        if (message.direction === 'inbound') {
            if (!current.lastInboundAt || new Date(current.lastInboundAt).getTime() < createdAtDate.getTime()) {
                current.lastInboundAt = message.createdAt;
                current.pendingMinutes = Math.floor((now.getTime() - createdAtDate.getTime()) / 60000);
            }
        } else if (
            !current.lastOutboundAt ||
            new Date(current.lastOutboundAt).getTime() < createdAtDate.getTime()
        ) {
            current.lastOutboundAt = message.createdAt;
        }
    }

    return Array.from(byPhone.values()).sort(
        (left, right) =>
            new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime()
    );
}

function buildPendingOrders(
    orders: CockpitRawData['recentOrders']
) {
    return orders
        .filter((order) => !isTerminalOrderStatus(order.status))
        .map((order) => ({
            orderId: order.orderId,
            status: order.status,
            updatedAt: order.updatedAt,
            valueLabel: formatCurrency(extractOrderValue(order.totals)),
        }));
}

function buildPendingFreight(
    shipments: CockpitRawData['recentShipments'],
    quotes: CockpitRawData['recentFreightQuotes']
) {
    const shipmentRows = shipments
        .filter((shipment) => !['entregue', 'delivered'].includes(toLowerText(shipment.status)))
        .map((shipment) => ({
            id: shipment.id,
            kind: 'shipment' as const,
            carrier: shipment.carrier,
            status: shipment.status,
            createdAt: shipment.updatedAt,
        }));

    if (shipmentRows.length > 0) {
        return shipmentRows;
    }

    return quotes.map((quote) => ({
        id: quote.correlationId,
        kind: 'quote' as const,
        carrier: quote.bestCarrier,
        status: quote.bestCarrier ? 'aguardando-aprovacao' : 'simulado',
        createdAt: quote.createdAt,
    }));
}

function buildRouteHints(snapshot: CockpitMetricsSnapshot, state: {
    topOrderId?: string;
    topFreightStatus?: string;
}) {
    const conversationsPriority =
        snapshot.failedWebhookEventsCount > 0 || snapshot.unansweredConversationCount > 10
            ? 'critica'
            : 'alta';

    return {
        conversationsHref:
            snapshot.unansweredConversationCount > 0
                ? `/conversas?status=nova&prioridade=${conversationsPriority}`
                : '/conversas',
        ordersHref:
            snapshot.pendingOrdersCount > 0
                ? '/pedidos?status=em-analise'
                : '/pedidos',
        logisticsHref:
            snapshot.pendingFreightCount > 0
                ? `/logistica?status=${toCanonicalLogisticsStatus(state.topFreightStatus ?? 'simulado')}`
                : '/logistica',
        exceptionsHref:
            snapshot.errorsAndExceptions > 0
                ? '/logistica?excecao=true'
                : '/logistica',
        simulatorHref: state.topOrderId
            ? `/logistica/simulador?pedido=${encodeURIComponent(state.topOrderId)}`
            : '/logistica/simulador',
        metricsHref: '/metricas',
    };
}

export async function resolveCockpitRequestContext(): Promise<CockpitRequestContext | null> {
    const headerStore = await headers();
    const tenantId = headerStore.get('x-auth-tenant-id')?.trim();

    if (!tenantId) {
        return null;
    }

    const role = headerStore.get('x-auth-role')?.trim() || 'viewer';
    const userId = headerStore.get('x-auth-user-id')?.trim() || null;
    const tenant = await tenantRepository.getTenantById(tenantId).catch(() => null);

    return {
        tenantId,
        role,
        userId,
        tenantName: tenant?.name ?? 'Tenant atual',
        timezone: tenant?.timezone ?? 'America/Sao_Paulo',
    };
}

export async function loadCockpitRawData(
    context: CockpitRequestContext
): Promise<CockpitRawData> {
    const db = await getDb();
    const partialBlocks: string[] = [];
    const now = new Date();
    const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

    async function safeLoad<T>(block: string, fallback: T, loader: () => Promise<T>) {
        try {
            return await loader();
        } catch {
            partialBlocks.push(block);
            return fallback;
        }
    }

    const [
        recentMessagesRows,
        recentOrdersRows,
        recentFreightQuotesRows,
        recentShipmentsRows,
        recentOperationalEventsRows,
        recentDomineEventsRows,
        activeIncidentsRows,
        failedWebhookRows,
        activeConversationCount,
        processingOrderCount,
        failedDomineEventsCount,
        activeIncidentCount,
        pendingFreightCount,
        simulationsToday,
        recentSimulationsRows,
        failedWebhookEventsCount,
        systemStatusPayload,
        diagSnapshot,
    ] = await Promise.all([
        safeLoad('messages', [] as CockpitRawData['recentMessages'], async () => {
            const rows = await db
                .select({
                    messageSid: messages.messageSid,
                    phoneHash: messages.phoneHash,
                    fromPhoneHash: messages.fromPhoneHash,
                    direction: messages.direction,
                    intent: messages.intent,
                    rawPayload: messages.rawPayload,
                    createdAt: messages.createdAt,
                })
                .from(messages)
                .where(and(eq(messages.tenantId, context.tenantId), gte(messages.createdAt, threeDaysAgo)))
                .orderBy(desc(messages.createdAt))
                .limit(180);

            return rows.map((row) => ({
                messageSid: row.messageSid,
                phoneKey: row.phoneHash ?? row.fromPhoneHash ?? row.messageSid,
                actorLabel: resolveMessageActorLabel(
                    row.rawPayload,
                    row.phoneHash ?? null,
                    null
                ),
                direction: row.direction === 'outbound' ? 'outbound' : 'inbound',
                intent: row.intent,
                createdAt: formatIso(row.createdAt),
            }));
        }),
        safeLoad('orders', [] as CockpitRawData['recentOrders'], async () => {
            const rows = await db
                .select({
                    orderId: domineOrders.orderId,
                    status: domineOrders.status,
                    totals: domineOrders.totals,
                    updatedAt: domineOrders.updatedAt,
                })
                .from(domineOrders)
                .where(eq(domineOrders.tenantId, context.tenantId))
                .orderBy(desc(domineOrders.updatedAt))
                .limit(60);

            return rows.map((row) => ({
                orderId: row.orderId,
                status: row.status,
                totals: row.totals,
                updatedAt: formatIso(row.updatedAt),
            }));
        }),
        safeLoad('freight_quotes', [] as CockpitRawData['recentFreightQuotes'], async () => {
            const rows = await db
                .select({
                    correlationId: domineFreightQuotes.correlationId,
                    bestCarrier: domineFreightQuotes.bestCarrier,
                    bestPriceCents: domineFreightQuotes.bestPriceCents,
                    bestEtaDays: domineFreightQuotes.bestEtaDays,
                    createdAt: domineFreightQuotes.createdAt,
                })
                .from(domineFreightQuotes)
                .where(eq(domineFreightQuotes.tenantId, context.tenantId))
                .orderBy(desc(domineFreightQuotes.createdAt))
                .limit(60);

            return rows.map((row) => ({
                correlationId: row.correlationId,
                bestCarrier: row.bestCarrier,
                bestPriceCents: row.bestPriceCents ?? null,
                bestEtaDays: row.bestEtaDays ?? null,
                createdAt: formatIso(row.createdAt),
            }));
        }),
        safeLoad('shipments', [] as CockpitRawData['recentShipments'], async () => {
            const rows = await db
                .select({
                    id: freightShipments.id,
                    carrier: freightShipments.carrier,
                    service: freightShipments.service,
                    status: freightShipments.status,
                    trackingCode: freightShipments.trackingCode,
                    createdAt: freightShipments.createdAt,
                    updatedAt: freightShipments.updatedAt,
                })
                .from(freightShipments)
                .where(withTenantNotDeleted(freightShipments, context.tenantId))
                .orderBy(desc(freightShipments.updatedAt))
                .limit(60);

            return rows.map((row) => ({
                id: row.id,
                carrier: row.carrier,
                service: row.service,
                status: row.status,
                trackingCode: row.trackingCode,
                createdAt: formatIso(row.createdAt),
                updatedAt: formatIso(row.updatedAt),
            }));
        }),
        safeLoad('operational_events', [] as CockpitRawData['recentOperationalEvents'], async () => {
            const rows = await db
                .select({
                    id: operationalEvents.id,
                    eventType: operationalEvents.eventType,
                    eventDomain: operationalEvents.eventDomain,
                    entityId: operationalEvents.entityId,
                    customerId: operationalEvents.customerId,
                    createdAt: operationalEvents.createdAt,
                })
                .from(operationalEvents)
                .where(eq(operationalEvents.tenantId, context.tenantId))
                .orderBy(desc(operationalEvents.createdAt))
                .limit(24);

            return rows.map((row) => ({
                id: row.id,
                eventType: row.eventType,
                eventDomain: row.eventDomain,
                entityId: row.entityId,
                customerId: row.customerId,
                createdAt: formatIso(row.createdAt),
            }));
        }),
        safeLoad('domine_events', [] as CockpitRawData['recentDomineEvents'], async () => {
            const rows = await db
                .select({
                    id: domineEvents.id,
                    type: domineEvents.type,
                    source: domineEvents.source,
                    status: domineEvents.status,
                    errorCode: domineEvents.errorCode,
                    createdAt: domineEvents.createdAt,
                })
                .from(domineEvents)
                .where(eq(domineEvents.tenantId, context.tenantId))
                .orderBy(desc(domineEvents.createdAt))
                .limit(24);

            return rows.map((row) => ({
                id: row.id,
                type: row.type,
                source: row.source,
                status: row.status,
                errorCode: row.errorCode,
                createdAt: formatIso(row.createdAt),
            }));
        }),
        safeLoad('incidents', [] as CockpitRawData['activeIncidents'], async () => {
            const rows = await db
                .select({
                    id: tenantIncidents.id,
                    type: tenantIncidents.type,
                    startedAt: tenantIncidents.startedAt,
                    triggeredBy: tenantIncidents.triggeredBy,
                })
                .from(tenantIncidents)
                .where(and(eq(tenantIncidents.tenantId, context.tenantId), isNull(tenantIncidents.endedAt)))
                .orderBy(desc(tenantIncidents.startedAt))
                .limit(12);

            return rows.map((row) => ({
                id: row.id,
                type: row.type,
                startedAt: formatIso(row.startedAt),
                triggeredBy: row.triggeredBy,
            }));
        }),
        safeLoad('webhooks', [] as CockpitRawData['failedWebhookEvents'], async () => {
            const rows = await db
                .select({
                    id: webhookEvents.id,
                    provider: webhookEvents.provider,
                    eventType: webhookEvents.eventType,
                    receivedAt: webhookEvents.receivedAt,
                })
                .from(webhookEvents)
                .where(and(eq(webhookEvents.status, 'failed'), gte(webhookEvents.receivedAt, dayAgo)))
                .orderBy(desc(webhookEvents.receivedAt))
                .limit(20);

            return rows.map((row) => ({
                id: row.id,
                provider: row.provider,
                eventType: row.eventType,
                receivedAt: formatIso(row.receivedAt),
            }));
        }),
        safeLoad('active_conversations_count', 0, async () => {
            const [row] = await db
                .select({
                    count: sql<number>`COUNT(DISTINCT COALESCE(${messages.phoneHash}, ${messages.fromPhoneHash}))`,
                })
                .from(messages)
                .where(and(eq(messages.tenantId, context.tenantId), gte(messages.createdAt, sixHoursAgo)));

            return Number(row?.count ?? 0);
        }),
        safeLoad('processing_orders_count', 0, async () => {
            const [row] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(domineOrders)
                .where(
                    sql`${domineOrders.tenantId} = ${context.tenantId}
                        AND LOWER(${domineOrders.status}) NOT IN ('concluido', 'completed', 'cancelado', 'cancelled', 'canceled', 'entregue')`
                );

            return Number(row?.count ?? 0);
        }),
        safeLoad('domine_failures_count', 0, async () => {
            const [row] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(domineEvents)
                .where(
                    and(
                        eq(domineEvents.tenantId, context.tenantId),
                        gte(domineEvents.createdAt, dayAgo),
                        sql`${domineEvents.status} IN ('failed', 'dead_letter')`
                    )
                );

            return Number(row?.count ?? 0);
        }),
        safeLoad('incidents_count', 0, async () => {
            const [row] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(tenantIncidents)
                .where(and(eq(tenantIncidents.tenantId, context.tenantId), isNull(tenantIncidents.endedAt)));

            return Number(row?.count ?? 0);
        }),
        safeLoad('pending_freight_count', 0, async () => {
            const [shipmentRow] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(freightShipments)
                .where(
                    withTenantNotDeleted(
                        freightShipments,
                        context.tenantId,
                        sql`LOWER(${freightShipments.status}) NOT IN ('entregue', 'delivered')`,
                    )
                );

            if (Number(shipmentRow?.count ?? 0) > 0) {
                return Number(shipmentRow?.count ?? 0);
            }

            const [quoteRow] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(domineFreightQuotes)
                .where(and(eq(domineFreightQuotes.tenantId, context.tenantId), gte(domineFreightQuotes.createdAt, dayAgo)));

            return Number(quoteRow?.count ?? 0);
        }),
        safeLoad('simulations_today', 0, async () => simulationRepository.countToday(context.tenantId)),
        safeLoad('recent_simulations', [] as CockpitRawData['recentSimulations'], async () => {
            const rows = await db
                .select({
                    id: simulations.id,
                    bestCarrier: simulations.bestCarrier,
                    bestService: simulations.bestService,
                    bestPrice: simulations.bestPrice,
                    createdAt: simulations.createdAt,
                })
                .from(simulations)
                .where(eq(simulations.tenantId, context.tenantId))
                .orderBy(desc(simulations.createdAt))
                .limit(24);

            return rows.map((row) => ({
                id: row.id,
                bestCarrier: row.bestCarrier,
                bestService: row.bestService,
                bestPrice: row.bestPrice ? String(row.bestPrice) : null,
                createdAt: formatIso(row.createdAt),
            }));
        }),
        safeLoad('webhook_failures_count', 0, async () => {
            const [row] = await db
                .select({ count: sql<number>`COUNT(*)` })
                .from(webhookEvents)
                .where(and(eq(webhookEvents.status, 'failed'), gte(webhookEvents.receivedAt, dayAgo)));

            return Number(row?.count ?? 0);
        }),
        safeLoad('system_status', null as SystemStatusPayload | null, async () =>
            getSystemStatus(context.tenantId, context.role)
        ),
        safeLoad('diag_snapshot', null as InternalDiagSnapshot | null, async () =>
            collectInternalDiagSnapshot()
        ),
    ]);

    const unansweredConversations = buildConversationSnapshots(recentMessagesRows, now).filter(
        (conversation) =>
            Boolean(conversation.lastInboundAt) &&
            (!conversation.lastOutboundAt ||
                new Date(conversation.lastInboundAt ?? conversation.lastActivityAt).getTime() >
                    new Date(conversation.lastOutboundAt).getTime())
    );
    const pendingOrders = buildPendingOrders(recentOrdersRows);
    const pendingFreight = buildPendingFreight(recentShipmentsRows, recentFreightQuotesRows);

    const metricsSnapshot: CockpitMetricsSnapshot = {
        activeConversationCount,
        unansweredConversationCount: unansweredConversations.length,
        processingOrderCount,
        pendingOrdersCount: pendingOrders.length,
        simulationsToday,
        pendingFreightCount,
        activeIncidentCount,
        failedDomineEventsCount,
        failedWebhookEventsCount,
        errorsAndExceptions:
            activeIncidentCount + failedDomineEventsCount + failedWebhookEventsCount,
        criticalSystemCount: [
            diagSnapshot?.db === 'fail',
            diagSnapshot?.redis === 'fail',
            systemStatusPayload?.infra.db === 'down',
            systemStatusPayload?.infra.redis === 'down',
        ].filter(Boolean).length,
    };

    const routeHints = buildRouteHints(metricsSnapshot, {
        topOrderId: pendingOrders[0]?.orderId,
        topFreightStatus: pendingFreight[0]?.status,
    });

    return {
        context,
        partialBlocks,
        generatedAt: now.toISOString(),
        diagSnapshot,
        systemStatusPayload,
        recentMessages: recentMessagesRows,
        recentSimulations: recentSimulationsRows,
        recentOrders: recentOrdersRows,
        recentFreightQuotes: recentFreightQuotesRows,
        recentShipments: recentShipmentsRows,
        recentOperationalEvents: recentOperationalEventsRows,
        recentDomineEvents: recentDomineEventsRows,
        activeIncidents: activeIncidentsRows,
        failedWebhookEvents: failedWebhookRows,
        derived: {
            metricsSnapshot,
            routeHints,
            unansweredConversations,
            pendingOrders,
            pendingFreight,
        },
    };
}
