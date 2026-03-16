import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { operationalMetrics } from '@/drizzle/schema';
import { logger } from '@/infra/logger';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

// --- Types ---

export const MetricNames = [
    'time_to_first_reply',
    'time_to_close_lead',
    'order_processing_time',
    'shipment_delay_rate',
] as const;

export type MetricName = typeof MetricNames[number];

// --- Service ---

export const metricsService = {
    /**
     * Record a metric data point.
     */
    async recordMetric(params: {
        tenantId: string;
        metric: MetricName;
        value: number;
        entityType?: string;
        entityId?: string;
        metadata?: Record<string, unknown>;
    }): Promise<string> {
        const db = await getDb();
        const id = randomUUID();

        try {
            await db.insert(operationalMetrics).values({
                id,
                tenantId: params.tenantId,
                metric: params.metric,
                value: String(params.value),
                entityType: params.entityType ?? null,
                entityId: params.entityId ?? null,
                metadataJson: params.metadata ?? null,
            });

            logger.info('metric_recorded', { metric: params.metric, value: params.value });
            return id;
        } catch (err) {
            logger.error('metric_record_failed', err as Error, { metric: params.metric });
            throw err;
        }
    },

    /**
     * Query metrics with optional filters and aggregation.
     */
    async getMetrics(params: {
        tenantId: string;
        metric?: MetricName;
        entityType?: string;
        entityId?: string;
        from?: Date;
        to?: Date;
        limit?: number;
    }) {
        const db = await getDb();
        const conditions = [eq(operationalMetrics.tenantId, params.tenantId)];

        if (params.metric) conditions.push(eq(operationalMetrics.metric, params.metric));
        if (params.entityType) conditions.push(eq(operationalMetrics.entityType, params.entityType));
        if (params.entityId) conditions.push(eq(operationalMetrics.entityId, params.entityId));
        if (params.from) conditions.push(gte(operationalMetrics.createdAt, params.from));
        if (params.to) conditions.push(lte(operationalMetrics.createdAt, params.to));

        return db
            .select()
            .from(operationalMetrics)
            .where(and(...conditions))
            .orderBy(desc(operationalMetrics.createdAt))
            .limit(params.limit ?? 100);
    },

    /**
     * Get aggregated metric averages.
     */
    async getAverages(params: {
        tenantId: string;
        metric: MetricName;
        from?: Date;
        to?: Date;
    }) {
        const db = await getDb();
        const conditions = [
            eq(operationalMetrics.tenantId, params.tenantId),
            eq(operationalMetrics.metric, params.metric),
        ];

        if (params.from) conditions.push(gte(operationalMetrics.createdAt, params.from));
        if (params.to) conditions.push(lte(operationalMetrics.createdAt, params.to));

        const result = await db
            .select({
                avg: sql<number>`AVG(${operationalMetrics.value})`,
                min: sql<number>`MIN(${operationalMetrics.value})`,
                max: sql<number>`MAX(${operationalMetrics.value})`,
                count: sql<number>`COUNT(*)`,
            })
            .from(operationalMetrics)
            .where(and(...conditions));

        return result[0] ?? { avg: 0, min: 0, max: 0, count: 0 };
    },
};
