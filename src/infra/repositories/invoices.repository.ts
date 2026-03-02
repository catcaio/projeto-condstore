import { getDb } from '@/infra/db';
import { invoices, NewInvoiceRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class InvoicesRepository {
    async create(record: NewInvoiceRecord) {
        const db = await getDb();
        await db.insert(invoices).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(invoices)
            .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)));
        return row || null;
    }
}

export const invoicesRepository = new InvoicesRepository();
