import { getDb } from '@/infra/db';
import { customerTimelineEvents, NewCustomerTimelineEventRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class CustomerTimelineRepository {
    async create(record: NewCustomerTimelineEventRecord) {
        const db = await getDb();
        await db.insert(customerTimelineEvents).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(customerTimelineEvents)
            .where(and(eq(customerTimelineEvents.tenantId, tenantId), eq(customerTimelineEvents.id, id)));
        return row || null;
    }
}

export const customerTimelineRepository = new CustomerTimelineRepository();
