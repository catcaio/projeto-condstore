import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';
import { eq, and, desc, sql, lt, or } from 'drizzle-orm';
import { format } from 'date-fns';

export class TimelineRepository {
    async getEvents(
        tenantId: string, 
        limit: number = 50, 
        cursor?: Date, 
        entityId?: string // contextual filtering
    ) {
        const db = await getDb();
        
        let conditions = [
            eq(operationalEvents.tenantId, tenantId)
        ];

        // Cursor pagination backwards
        if (cursor) {
            conditions.push(lt(operationalEvents.createdAt, cursor));
        }

        // Entity filter. Events don't strictly separate entity types visually in db except as `entityId`, 
        // so we filter strictly by entityId. We could parse the payload JSON but JSON extraction is slow.
        if (entityId) {
            // we filter by entityId column.
            const entityIdCond = or(
                eq(operationalEvents.entityId, entityId),
                sql`JSON_UNQUOTE(JSON_EXTRACT(${operationalEvents.payload}, '$.conversationId')) = ${entityId}`,
                sql`JSON_UNQUOTE(JSON_EXTRACT(${operationalEvents.payload}, '$.orderId')) = ${entityId}`
            );
            // Drizzle doesn't handle the OR directly in the array nicely if it's undefined, but we know it's defined here.
            conditions.push(entityIdCond as any);
        }

        const records = await db
            .select()
            .from(operationalEvents)
            .where(and(...conditions))
            .orderBy(desc(operationalEvents.createdAt))
            .limit(limit);

        return records;
    }
}

export const timelineRepository = new TimelineRepository();
