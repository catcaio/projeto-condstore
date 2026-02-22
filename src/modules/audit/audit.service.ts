import { randomUUID } from 'crypto';
import { getDb } from '../../infra/db';
import { tenantEvents } from '../../drizzle/schema';
import { logger } from '../../infra/logger';

export type AuditEventType =
    | 'PLAN_ACTIVATED'
    | 'PLAN_UPDATED'
    | 'PLAN_CANCELED'
    | 'SIMULATION_CREATED'
    | 'SIMULATION_FAILED'
    | 'LOGIN_SUCCESS'
    | 'LOGIN_FAILED';

export class AuditService {
    async logEvent(tenantId: string, type: AuditEventType, payload: Record<string, any> = {}) {
        try {
            const db = await getDb();

            await db.insert(tenantEvents).values({
                id: randomUUID(),
                tenantId,
                type,
                payload: JSON.stringify(payload)
            });

            logger.info('Audit event logged', {
                tenantId,
                eventType: type
            });
        } catch (error: any) {
            // We shouldn't fail the primary business action if the audit log fails
            logger.error('Failed to insert audit event', error, { tenantId, type, payload });
        }
    }
}

export const auditService = new AuditService();
