import { getDb } from '@/infra/db';
import { sql, eq, and, desc, lte } from 'drizzle-orm';
import { freightSimulationLogs, freightFunnelEvents } from '@/drizzle/schema';

export async function listSimulations(
    tenantId: string,
    limit: number = 50,
    cursor?: string,
    q?: string
) {
    const db = await getDb();

    const conditions = [eq(freightSimulationLogs.tenantId, tenantId)];

    if (cursor) {
        conditions.push(lte(freightSimulationLogs.createdAt, new Date(cursor)));
    }

    if (q) {
        conditions.push(
            sql`LOWER(${freightSimulationLogs.uf}) LIKE LOWER(${'%' + q + '%'}) OR ${freightSimulationLogs.id} = ${q}`
        );
    }

    const items = await db.select()
        .from(freightSimulationLogs)
        .where(and(...conditions))
        .orderBy(desc(freightSimulationLogs.createdAt))
        .limit(limit);

    return items;
}

export async function getSimulationDetail(tenantId: string, id: string) {
    const db = await getDb();

    const logs = await db.select()
        .from(freightSimulationLogs)
        .where(and(
            eq(freightSimulationLogs.tenantId, tenantId),
            eq(freightSimulationLogs.id, id)
        ))
        ;

    return logs.length > 0 ? logs[0] : null;
}

export async function getSimulationFunnel(tenantId: string, simulationRefToken: string | null) {
    if (!simulationRefToken) return [];

    const db = await getDb();

    return db.select()
        .from(freightFunnelEvents)
        .where(and(
            eq(freightFunnelEvents.tenantId, tenantId),
            eq(freightFunnelEvents.refToken, simulationRefToken)
        ))
        .orderBy(desc(freightFunnelEvents.createdAt));
}
