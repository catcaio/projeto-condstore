import { getDb } from '@/infra/db';
import { sql, eq, and, desc, gte } from 'drizzle-orm';
import {
    messages,
    publicEvents,
    freightFunnelEvents,
} from '@/drizzle/schema';

import { buildConversationKey, maskPhone, maskRefToken, deriveConversationStatus, type ConversationStatus } from './utils';
import { logger } from '@/infra/logger';

export type InboxConversation = {
    convoId: string; // Used to mount links, not strictly readable structure
    phoneMasked?: string;
    refTokenMasked?: string;
    title: string;
    lastActivityAt: Date;
    lastInboundAt?: Date;
    lastOutboundAt?: Date;
    lastKind: string;
    utmSource?: string;
    utmCampaign?: string;
    status: ConversationStatus;
    slaMinutes?: number;
};

export class InboxError extends Error {
    public readonly status: number;
    constructor(message: string, status: number = 400) {
        super(message);
        this.name = 'InboxError';
        this.status = status;
    }
}

export async function getInboxConversations(
    tenantId: string,
    limit: number = 50,
    cursor?: string, // fallback to id-pagination if needed 
    filters?: { status?: string, rangeDays?: number }
): Promise<InboxConversation[]> {
    const t0 = performance.now();
    let rowsFetchedTotal = 0;

    // GUARDRAILS DE CARGA
    let requestedDays = filters?.rangeDays ?? 7;
    if (requestedDays < 1) requestedDays = 1;
    if (requestedDays > 30) {
        throw new InboxError("reduza days");
    }

    const maxRowsPorFonte = 5000;
    if (limit > 20000) {
        throw new InboxError("reduza limite");
    }

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - requestedDays);

    const db = await getDb();
    const map = new Map<string, InboxConversation & { originalKey?: string, rawPhone?: string, rawRefToken?: string }>();

    const getOrInit = (key: string, originalKey: string, rawPhone?: string, rawRef?: string) => {
        if (!map.has(key)) {
            const maskedPhone = maskPhone(rawPhone);
            const refMasked = maskRefToken(rawRef);

            map.set(key, {
                convoId: originalKey, // We use the real ID to find the thread later
                originalKey: originalKey, // Real DB key
                title: maskedPhone || (rawRef ? `Token: ${refMasked}` : 'Unknown'),
                phoneMasked: maskedPhone,
                refTokenMasked: refMasked,
                lastActivityAt: new Date(0),
                lastKind: 'unknown',
                status: 'closed'
            });
        }
        return map.get(key)!;
    };

    // 1. Messages
    try {
        const msgs = await db.select()
            .from(messages)
            .where(and(eq(messages.tenantId, tenantId), gte(messages.createdAt, minDate)))
            .orderBy(desc(messages.createdAt))
            .limit(maxRowsPorFonte);

        rowsFetchedTotal += msgs.length;

        for (const m of msgs) {
            const rawHash = m.direction === 'inbound' ? m.fromPhoneHash : m.toPhone;
            if (!rawHash) continue;

            const groupKey = buildConversationKey({ tenantId, phoneRaw: rawHash });
            const convo = getOrInit(groupKey, rawHash, rawHash);
            convo.lastKind = 'message';

            if (m.createdAt > convo.lastActivityAt) convo.lastActivityAt = m.createdAt;

            if (m.direction === 'inbound') {
                if (!convo.lastInboundAt || m.createdAt > convo.lastInboundAt) convo.lastInboundAt = m.createdAt;
            } else {
                if (!convo.lastOutboundAt || m.createdAt > convo.lastOutboundAt) convo.lastOutboundAt = m.createdAt;
            }
        }
    } catch { }

    // 2. Freight Funnel
    try {
        const funnels = await db.select()
            .from(freightFunnelEvents)
            .where(and(eq(freightFunnelEvents.tenantId, tenantId), gte(freightFunnelEvents.createdAt, minDate)))
            .orderBy(desc(freightFunnelEvents.createdAt))
            .limit(maxRowsPorFonte);

        rowsFetchedTotal += funnels.length;

        for (const f of funnels) {
            let groupKey;
            try {
                groupKey = buildConversationKey({ tenantId, phoneRaw: f.phoneNumber, refToken: f.refToken || f.sessionId });
            } catch {
                continue; // no phone or token
            }

            const originalKey = f.phoneNumber || f.refToken || f.sessionId;

            // Re-bind masked refs if we got new data
            const convo = getOrInit(groupKey, originalKey!, f.phoneNumber || undefined, f.refToken || undefined);

            if (!convo.utmSource && f.utmSource) convo.utmSource = f.utmSource;
            if (!convo.utmCampaign && f.utmCampaign) convo.utmCampaign = f.utmCampaign;

            if (f.createdAt > convo.lastActivityAt) {
                convo.lastActivityAt = f.createdAt;
                if (convo.lastKind === 'unknown') convo.lastKind = 'freight';
            }

            if (!convo.lastInboundAt || f.createdAt > convo.lastInboundAt) convo.lastInboundAt = f.createdAt;
        }
    } catch { }

    // 3. Public Events
    try {
        const events = await db.select()
            .from(publicEvents)
            .where(and(eq(publicEvents.tenantId, tenantId), gte(publicEvents.createdAt, minDate)))
            .orderBy(desc(publicEvents.createdAt))
            .limit(maxRowsPorFonte);

        rowsFetchedTotal += events.length;

        for (const e of events) {
            if (!e.attributionId && !e.anonId) continue; // publicEvents has anonId/attributionId, not refToken
            let groupKey;
            try {
                // If it doesn't align tightly with phone, it drops back to anonId grouping
                groupKey = buildConversationKey({ tenantId, refToken: e.attributionId || e.anonId });
            } catch {
                continue;
            }

            const convo = getOrInit(groupKey, e.attributionId || e.anonId!, undefined, e.attributionId || undefined);

            if (e.createdAt > convo.lastActivityAt) {
                convo.lastActivityAt = e.createdAt;
                if (convo.lastKind === 'unknown') convo.lastKind = 'event';
            }

            if (!convo.lastInboundAt || e.createdAt > convo.lastInboundAt) convo.lastInboundAt = e.createdAt;
        }
    } catch { }

    const results = Array.from(map.values()).map(c => {
        const res = deriveConversationStatus(c.lastActivityAt, c.lastInboundAt, c.lastOutboundAt, requestedDays);
        c.status = res.status;
        c.slaMinutes = res.slaMinutes;

        // Ensure no raw PII makes it out to the client
        delete c.rawPhone;
        delete c.rawRefToken;
        delete c.originalKey;

        return c;
    });

    let filtered = results;
    if (filters?.status && filters.status !== 'all') {
        filtered = results.filter(c => c.status === filters.status);
    }

    filtered.sort((a, b) => {
        // DESC timestamp
        const tDiff = b.lastActivityAt.getTime() - a.lastActivityAt.getTime();
        if (tDiff !== 0) return tDiff;
        // ASC ID tie-break completely deterministic
        return a.convoId.localeCompare(b.convoId);
    });

    let startIndex = 0;
    if (cursor) {
        const idx = filtered.findIndex(c => c.convoId === cursor);
        if (idx !== -1) startIndex = idx + 1;
    }

    const page = filtered.slice(startIndex, startIndex + limit);

    const msTotal = performance.now() - t0;

    logger.info('inbox_queue_fetched', {
        route: "/inbox",
        tenantId,
        days: requestedDays,
        rowsFetchedTotal,
        groupsCount: map.size,
        returnedPageSize: page.length,
        msTotal: Math.round(msTotal)
    });

    return page;
}
