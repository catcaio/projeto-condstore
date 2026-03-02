import { getDb } from '@/infra/db';
import { sites, NewSiteRecord } from '@/drizzle/schema';
import { eq, and } from 'drizzle-orm';

export class SitesRepository {
    async create(record: NewSiteRecord) {
        const db = await getDb();
        await db.insert(sites).values(record);
        return this.getById(record.tenantId, record.id);
    }

    async getById(tenantId: string, id: string) {
        const db = await getDb();
        const [row] = await db.select()
            .from(sites)
            .where(and(eq(sites.tenantId, tenantId), eq(sites.id, id)));
        return row || null;
    }
}

export const sitesRepository = new SitesRepository();
