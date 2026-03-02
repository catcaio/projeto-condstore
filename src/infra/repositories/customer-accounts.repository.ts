import { getDb } from '@/infra/db';
import { customerAccounts, NewCustomerAccountRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class CustomerAccountsRepository {
    async create(record: NewCustomerAccountRecord) {
        const db = await getDb();
        await db.insert(customerAccounts).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(customerAccounts)
            .where(and(eq(customerAccounts.tenantId, tenantId), eq(customerAccounts.id, id)));
        return row || null;
    }

    async getByUserIdAndOrganizationId(tenantId: string, userId: string, organizationId: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(customerAccounts)
            .where(and(
                eq(customerAccounts.tenantId, tenantId),
                eq(customerAccounts.userId, userId),
                eq(customerAccounts.organizationId, organizationId),
                eq(customerAccounts.status, 'active')
            ));
        return row || null;
    }
}

export const customerAccountsRepository = new CustomerAccountsRepository();
