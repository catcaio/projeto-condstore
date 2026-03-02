import { getDb } from '@/infra/db';
import { deliveryProofs, NewDeliveryProofRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class DeliveryProofsRepository {
    async create(record: NewDeliveryProofRecord) {
        const db = await getDb();
        await db.insert(deliveryProofs).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(deliveryProofs)
            .where(and(eq(deliveryProofs.tenantId, tenantId), eq(deliveryProofs.id, id)));
        return row || null;
    }
}

export const deliveryProofsRepository = new DeliveryProofsRepository();
