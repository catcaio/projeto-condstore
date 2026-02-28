import { getDb } from '../db';
import { tenantIncidents, NewTenantIncidentRecord } from '../../drizzle/schema';
import crypto from 'crypto';

class TenantIncidentsRepository {
    async logIncident(data: Omit<NewTenantIncidentRecord, 'id'>) {
        const db = await getDb();
        await db.insert(tenantIncidents).values({
            id: crypto.randomUUID(),
            ...data
        });
    }

    async closeIncident(tenantId: string, type: string) {
        // Implement logic to close an active incident of a specific type
        const db = await getDb();
        // Just mock for now, this would usually update endedAt
    }
}

export const tenantIncidentsRepository = new TenantIncidentsRepository();
