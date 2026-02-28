import { getDb } from '@/infra/db';
import { sql, eq, and, desc, lte } from 'drizzle-orm';
import {
    messages,
    publicEvents,
    freightFunnelEvents,
    tenantEvents
} from '@/drizzle/schema';

export type InboxItemKind = 'message' | 'webhook' | 'event' | 'freight';

export type InboxItem = {
    id: string;
    kind: InboxItemKind;
    title: string;
    subtitle?: string;
    status?: string;
    createdAt: Date;
    rawRef?: string;
};

export async function getInboxItems(
    tenantId: string,
    limit: number = 50,
    cursor?: string,
    filterKind?: string,
    searchQuery?: string
): Promise<InboxItem[]> {
    const db = await getDb();

    // Preparar queries independentes
    const items: InboxItem[] = [];
    const maxDate = cursor ? new Date(cursor) : new Date();

    const fetchMessages = async () => {
        if (filterKind && filterKind !== 'message') return;
        try {
            const conditions = [eq(messages.tenantId, tenantId), lte(messages.createdAt, maxDate)];
            if (searchQuery) conditions.push(sql`LOWER(${messages.body}) LIKE LOWER(${'%' + searchQuery + '%'})`);

            const res = await db.select()
                .from(messages)
                .where(and(...conditions))
                .orderBy(desc(messages.createdAt))
                .limit(limit);

            res.forEach(m => {
                items.push({
                    id: m.messageSid,
                    kind: 'message',
                    title: m.direction === 'inbound' ? 'Mensagem Recebida' : 'Mensagem Enviada',
                    subtitle: String(m.intent) || 'unknown',
                    status: m.direction,
                    createdAt: m.createdAt,
                    rawRef: m.fromPhone
                });
            });
        } catch { }
    };

    const fetchPublicEvents = async () => {
        if (filterKind && filterKind !== 'event') return;
        try {
            const conditions = [eq(publicEvents.tenantId, tenantId), lte(publicEvents.createdAt, maxDate)];
            if (searchQuery) conditions.push(sql`LOWER(${publicEvents.event}) LIKE LOWER(${'%' + searchQuery + '%'})`);

            const res = await db.select()
                .from(publicEvents)
                .where(and(...conditions))
                .orderBy(desc(publicEvents.createdAt))
                .limit(limit);

            res.forEach(p => {
                items.push({
                    id: p.id,
                    kind: 'event',
                    title: p.event,
                    subtitle: p.path,
                    status: 'public',
                    createdAt: p.createdAt,
                    rawRef: p.anonId
                });
            });
        } catch { }
    };

    const fetchFreightFunnel = async () => {
        if (filterKind && filterKind !== 'freight') return;
        try {
            const conditions = [eq(freightFunnelEvents.tenantId, tenantId), lte(freightFunnelEvents.createdAt, maxDate)];
            if (searchQuery) conditions.push(sql`LOWER(${freightFunnelEvents.stage}) LIKE LOWER(${'%' + searchQuery + '%'})`);

            const res = await db.select()
                .from(freightFunnelEvents)
                .where(and(...conditions))
                .orderBy(desc(freightFunnelEvents.createdAt))
                .limit(limit);

            res.forEach(f => {
                items.push({
                    id: f.id,
                    kind: 'freight',
                    title: 'Funil: ' + f.stage,
                    subtitle: f.utmSource ? 'Source: ' + f.utmSource : undefined,
                    status: f.stage,
                    createdAt: f.createdAt,
                    rawRef: f.phoneNumber || f.sessionId
                });
            });
        } catch { }
    };

    const fetchTenantEvents = async () => {
        if (filterKind && filterKind !== 'webhook') return; // map tenant events to 'webhook' kind for UI
        try {
            const conditions = [eq(tenantEvents.tenantId, tenantId), lte(tenantEvents.createdAt, maxDate)];
            if (searchQuery) conditions.push(sql`LOWER(${tenantEvents.type}) LIKE LOWER(${'%' + searchQuery + '%'})`);

            const res = await db.select()
                .from(tenantEvents)
                .where(and(...conditions))
                .orderBy(desc(tenantEvents.createdAt))
                .limit(limit);

            res.forEach(t => {
                items.push({
                    id: t.id,
                    kind: 'webhook',
                    title: t.type,
                    status: 'system',
                    createdAt: t.createdAt,
                });
            });
        } catch { }
    };

    // Parallel fetch
    await Promise.all([
        fetchMessages(),
        fetchPublicEvents(),
        fetchFreightFunnel(),
        fetchTenantEvents()
    ]);

    // Merge Sort
    items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Cut to limit
    return items.slice(0, limit);
}
