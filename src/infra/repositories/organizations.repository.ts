import { getDb } from '@/infra/db';
import { organizations, NewOrganizationRecord } from '@/drizzle/schema';
import { eq, and, ne } from 'drizzle-orm';

export class OrganizationsRepository {
    async create(record: NewOrganizationRecord) {
        const db = await getDb();
        await db.insert(organizations).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(organizations)
            .where(and(
                eq(organizations.tenantId, tenantId),
                eq(organizations.id, id),
                ne(organizations.status, 'merged'),
            ));
        return row || null;
    }
}

export const organizationsRepository = new OrganizationsRepository();
