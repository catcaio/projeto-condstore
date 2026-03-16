import { getDb } from '@/infra/db';
import { operationalAuditLogs } from '@/drizzle/schema';
import { randomUUID } from 'crypto';
import { eq, and, asc, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export type OperationalEntityType = 'opportunity' | 'order' | 'client' | 'conversation' | 'shipment';
export type ActionOrigin = 'ui' | 'bulk' | 'drawer' | 'palette' | 'frank' | 'system';

export interface LogOperationalActivityParams {
    tenantId: string;
    entityType: OperationalEntityType;
    entityId: string;
    actorId?: string; // system, user_id, or 'frank'
    actionType: string;
    beforeState?: any;
    afterState?: any;
    origin?: ActionOrigin;
    metadata?: any;
}

export class OperationalAuditService {
    async logActivity(params: LogOperationalActivityParams) {
        try {
            const db = await getDb();
            await db.insert(operationalAuditLogs).values({
                id: randomUUID(),
                tenantId: params.tenantId,
                entityType: params.entityType,
                entityId: params.entityId,
                actorId: params.actorId || 'system',
                actionType: params.actionType,
                beforeState: params.beforeState || null,
                afterState: params.afterState || null,
                origin: params.origin || 'ui',
                metadata: params.metadata || null,
            });
            logger.info('Operational activity logged', {
                tenantId: params.tenantId,
                entityType: params.entityType,
                entityId: params.entityId,
                actionType: params.actionType
            });
        } catch (error: any) {
            logger.error('Failed to log operational activity', error, params as Record<string, any>);
        }
    }

    async getHistoryForEntity(tenantId: string, entityType: OperationalEntityType, entityId: string, limit: number = 20) {
        const db = await getDb();
        return db.select()
            .from(operationalAuditLogs)
            .where(
                and(
                    eq(operationalAuditLogs.tenantId, tenantId),
                    eq(operationalAuditLogs.entityType, entityType),
                    eq(operationalAuditLogs.entityId, entityId)
                )
            )
            .orderBy(desc(operationalAuditLogs.createdAt))
            .limit(limit);
    }
}

export const operationalAuditService = new OperationalAuditService();
