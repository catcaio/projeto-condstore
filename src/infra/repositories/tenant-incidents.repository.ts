import { getDb } from '../db';
import { tenantIncidents, NewTenantIncidentRecord } from '../../drizzle/schema';
import { and, desc, eq, gte, lte } from 'drizzle-orm';
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

    async list(tenantId: string, filters: { type?: string; triggeredBy?: string; from?: Date; to?: Date; page?: number; limit?: number }) {
        const db = await getDb();
        const conditions = [eq(tenantIncidents.tenantId, tenantId)];

        if (filters.type) conditions.push(eq(tenantIncidents.type, filters.type));
        if (filters.triggeredBy) conditions.push(eq(tenantIncidents.triggeredBy, filters.triggeredBy));
        if (filters.from) conditions.push(gte(tenantIncidents.startedAt, filters.from));
        if (filters.to) conditions.push(lte(tenantIncidents.startedAt, filters.to));

        const offset = ((filters.page || 1) - 1) * (filters.limit || 50);

        const data = await db.select()
            .from(tenantIncidents)
            .where(and(...conditions))
            .orderBy(desc(tenantIncidents.startedAt))
            .limit(filters.limit || 50)
            .offset(offset);

        return data;
    }
}

export const tenantIncidentsRepository = new TenantIncidentsRepository();
