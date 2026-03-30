/**
 * cockpit-metrics-engine.ts
 * Derives tenant-level business metrics from operational_events.
 *
 * Data source: operational_events (primary) — always queries from this table.
 * Caller passes a { from, to } DateRange to bound the query window.
 */

import { and, eq, gte, lte, sql, count } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MetricsDateRange {
    from: Date;
    to: Date;
}

export interface AcquisitionMetrics {
    leads_total: number;
    attributed_traffic_total: number;
}

export interface ConversionMetrics {
    quotes_total: number;
    checkout_started_total: number;
    checkout_completed_total: number;
    orders_total: number;
    quote_to_order_rate: number;
    checkout_completion_rate: number;
}

export interface OperationsMetrics {
    messages_received_total: number;
    message_replied_total: number;
    delivery_created_total: number;
    delivery_completed_total: number;
}

export interface RevenueMetrics {
    payments_confirmed_total: number;
}

export interface RetentionMetrics {
    repeat_orders_total: number;
    reactivated_customers_total: number;
}

export interface RoiPilotMetrics {
    avg_response_time_seconds: number;
    avg_quote_time_minutes: number;
    orders_created_total: number;
    handoffs_total: number;
    operational_conversion_rate: number;
}

export interface TenantCoreMetrics {
    tenantId: string;
    range: { from: string; to: string };
    acquisition: AcquisitionMetrics;
    conversion: ConversionMetrics;
    operations: OperationsMetrics;
    revenue: RevenueMetrics;
    retention: RetentionMetrics;
    roi: RoiPilotMetrics;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Count events of a given type within the date range for a tenant. */
async function countEvents(
    tenantId: string,
    eventType: string,
    range: MetricsDateRange,
): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({ total: count() })
        .from(operationalEvents)
        .where(
            and(
                eq(operationalEvents.tenantId, tenantId),
                eq(operationalEvents.eventType, eventType),
                gte(operationalEvents.createdAt, range.from),
                lte(operationalEvents.createdAt, range.to),
            ),
        );
    return rows[0]?.total ?? 0;
}


async function avgNumericPayloadByEvent(
    tenantId: string,
    eventType: string,
    payloadKey: string,
    range: MetricsDateRange,
): Promise<number> {
    const db = await getDb();
    const rows = await db
        .select({
            avgValue: sql<number>`AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(${operationalEvents.payload}, ${`$.${payloadKey}`})) AS DECIMAL(20,4)))`,
        })
        .from(operationalEvents)
        .where(
            and(
                eq(operationalEvents.tenantId, tenantId),
                eq(operationalEvents.eventType, eventType),
                gte(operationalEvents.createdAt, range.from),
                lte(operationalEvents.createdAt, range.to),
            ),
        );

    const value = Number(rows[0]?.avgValue ?? 0);
    return Number.isFinite(value) ? value : 0;
}

/** Safe division — returns 0 if denominator is 0. */
function safeRate(numerator: number, denominator: number): number {
    if (denominator === 0) return 0;
    return Math.round((numerator / denominator) * 10000) / 10000; // 4 decimal places
}

// ── Domain metric functions ───────────────────────────────────────────────────

export async function getAcquisitionMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<AcquisitionMetrics> {
    const [leads_total, attributed_traffic_total] = await Promise.all([
        countEvents(tenantId, 'lead_created', range),
        countEvents(tenantId, 'traffic_attributed', range),
    ]);
    return { leads_total, attributed_traffic_total };
}

export async function getConversionMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<ConversionMetrics> {
    const [quotes_total, checkout_started_total, checkout_completed_total, orders_total] =
        await Promise.all([
            countEvents(tenantId, 'quote_created', range),
            countEvents(tenantId, 'checkout_started', range),
            countEvents(tenantId, 'checkout_completed', range),
            countEvents(tenantId, 'order_created', range),
        ]);

    return {
        quotes_total,
        checkout_started_total,
        checkout_completed_total,
        orders_total,
        quote_to_order_rate: safeRate(orders_total, quotes_total),
        checkout_completion_rate: safeRate(checkout_completed_total, checkout_started_total),
    };
}

export async function getOperationsMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<OperationsMetrics> {
    const [messages_received_total, message_replied_total, delivery_created_total, delivery_completed_total] =
        await Promise.all([
            countEvents(tenantId, 'message_received', range),
            countEvents(tenantId, 'message_replied', range),
            countEvents(tenantId, 'delivery_created', range),
            countEvents(tenantId, 'delivery_completed', range),
        ]);
    return { messages_received_total, message_replied_total, delivery_created_total, delivery_completed_total };
}

export async function getRevenueMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<RevenueMetrics> {
    const [payments_confirmed_total] = await Promise.all([
        countEvents(tenantId, 'payment_confirmed', range),
    ]);
    return { payments_confirmed_total };
}

export async function getRetentionMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<RetentionMetrics> {
    const [repeat_orders_total, reactivated_customers_total] = await Promise.all([
        countEvents(tenantId, 'repeat_order', range),
        countEvents(tenantId, 'customer_reactivated', range),
    ]);
    return { repeat_orders_total, reactivated_customers_total };
}


export async function getRoiPilotMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<RoiPilotMetrics> {
    const [
        avgResponseTimeMs,
        avgQuoteTimeMs,
        orders_created_total,
        handoffs_total,
        wonDeals,
        quotedDeals,
    ] = await Promise.all([
        avgNumericPayloadByEvent(tenantId, 'message_replied', 'responseTimeMs', range),
        avgNumericPayloadByEvent(tenantId, 'quote_created', 'quoteTimeMs', range),
        countEvents(tenantId, 'order_created', range),
        countEvents(tenantId, 'conversation_assigned', range),
        countEvents(tenantId, 'deal_won', range),
        countEvents(tenantId, 'quote_created', range),
    ]);

    return {
        avg_response_time_seconds: Math.round((avgResponseTimeMs / 1000) * 100) / 100,
        avg_quote_time_minutes: Math.round((avgQuoteTimeMs / (1000 * 60)) * 100) / 100,
        orders_created_total,
        handoffs_total,
        operational_conversion_rate: safeRate(wonDeals, quotedDeals),
    };
}

// ── getTenantCoreMetrics ──────────────────────────────────────────────────────

export async function getTenantCoreMetrics(
    tenantId: string,
    range: MetricsDateRange,
): Promise<TenantCoreMetrics> {
    const [acquisition, conversion, operations, revenue, retention, roi] = await Promise.all([
        getAcquisitionMetrics(tenantId, range),
        getConversionMetrics(tenantId, range),
        getOperationsMetrics(tenantId, range),
        getRevenueMetrics(tenantId, range),
        getRetentionMetrics(tenantId, range),
        getRoiPilotMetrics(tenantId, range),
    ]);

    return {
        tenantId,
        range: { from: range.from.toISOString(), to: range.to.toISOString() },
        acquisition,
        conversion,
        operations,
        revenue,
        retention,
        roi,
    };
}
