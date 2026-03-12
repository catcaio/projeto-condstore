import { timelineRepository, TimelineRepository } from './timeline.repository';
import { TimelineEvent, TimelineEntity } from './timeline.types';
import { mapOperationalEventToTimeline } from './timeline.mapper';

export class TimelineService {
    constructor(private readonly repo: TimelineRepository = timelineRepository) {}

    async getTimeline(
        tenantId: string, 
        limit: number = 50, 
        cursor?: Date, 
        entity?: TimelineEntity, // Global filter vs context
        entityId?: string
    ): Promise<{ events: TimelineEvent[], nextCursor?: Date }> {
        
        // We fetch slightly more to know if there's a next page
        const records = await this.repo.getEvents(tenantId, limit + 1, cursor, entityId);

        let hasMore = records.length > limit;
        const pageRecords = hasMore ? records.slice(0, limit) : records;

        const events: TimelineEvent[] = [];

        for (const row of pageRecords) {
            const parsed = mapOperationalEventToTimeline({
                id: row.id,
                tenantId: row.tenantId,
                eventType: row.eventType,
                entityId: row.entityId,
                payload: typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload,
                createdAt: row.createdAt,
            });

            if (parsed) {
                // If the user requested a specific global entity filter
                if (entity && parsed.entity !== entity) {
                    continue; // Skip if it doesn't match the entity requested
                }
                events.push(parsed);
            }
        }

        const nextCursor = hasMore ? pageRecords[pageRecords.length - 1].createdAt : undefined;

        // Note: The entity filter above happens in-memory (post-db) because the DB payload structure 
        // doesn't natively expose 'TimelineEntity' perfectly (it's inferred in mapper).
        // Since we fetch 50 rows per DB fetch, if we skip a lot, we might return fewer than 50 events. 
        // That's acceptable for a timeline feed to fetch more if needed.

        return {
            events,
            nextCursor
        };
    }
}

export const timelineService = new TimelineService();
