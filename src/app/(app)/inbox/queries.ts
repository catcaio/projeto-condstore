import { getDb } from '@/infra/db';
import { sql, eq, and, desc, gte } from 'drizzle-orm';
import {
    messages,
    publicEvents,
    freightFunnelEvents,
} from '@/drizzle/schema';

export type ConversationStatus = 'open' | 'pending' | 'closed';

export type InboxConversation = {
    convoId: string;
    contactKey?: string;
    refToken?: string;
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

export async function getInboxConversations(
    tenantId: string,
    limit: number = 50,
    cursor?: string, // fallback to date pagination if needed, or index
    filters?: { status?: string, rangeDays?: number }
): Promise<InboxConversation[]> {
    const db = await getDb();
    const rangeDays = filters?.rangeDays || 7;

    const minDate = new Date();
    minDate.setDate(minDate.getDate() - rangeDays);

    const map = new Map<string, InboxConversation>();

    const getOrInit = (key: string, defaultTitle: string) => {
        if (!map.has(key)) {
            map.set(key, {
                convoId: key,
                title: defaultTitle,
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
            .orderBy(desc(messages.createdAt));

        for (const m of msgs) {
            // Find key: opposite of our tenant system? Assuming fromPhone/toPhone
            // If strictly inbound, contactKey is fromPhone. If outbound, toPhone.
            const contactKey = m.direction === 'inbound' ? m.fromPhone : m.toPhone;
            if (!contactKey) continue;

            const convo = getOrInit(contactKey, contactKey);
            convo.contactKey = contactKey;
            convo.lastKind = 'message';

            if (m.createdAt > convo.lastActivityAt) {
                convo.lastActivityAt = m.createdAt;
            }

            if (m.direction === 'inbound') {
                if (!convo.lastInboundAt || m.createdAt > convo.lastInboundAt) {
                    convo.lastInboundAt = m.createdAt;
                }
            } else {
                if (!convo.lastOutboundAt || m.createdAt > convo.lastOutboundAt) {
                    convo.lastOutboundAt = m.createdAt;
                }
            }
        }
    } catch { }

    // 2. Freight Funnel
    try {
        const funnels = await db.select()
            .from(freightFunnelEvents)
            .where(and(eq(freightFunnelEvents.tenantId, tenantId), gte(freightFunnelEvents.createdAt, minDate)))
            .orderBy(desc(freightFunnelEvents.createdAt));

        for (const f of funnels) {
            const key = f.phoneNumber || f.refToken || f.sessionId;
            if (!key) continue;

            const convo = getOrInit(key, f.phoneNumber ? f.phoneNumber : `Token: ${key.slice(0, 8)}`);
            if (f.phoneNumber) convo.contactKey = f.phoneNumber;
            if (f.refToken) convo.refToken = f.refToken;
            if (!convo.utmSource && f.utmSource) convo.utmSource = f.utmSource;
            if (!convo.utmCampaign && f.utmCampaign) convo.utmCampaign = f.utmCampaign;

            if (f.createdAt > convo.lastActivityAt) {
                convo.lastActivityAt = f.createdAt;
                if (convo.lastKind === 'unknown') convo.lastKind = 'freight';
            }

            // Treat funnel progression as inbound activity from user
            if (!convo.lastInboundAt || f.createdAt > convo.lastInboundAt) {
                convo.lastInboundAt = f.createdAt;
            }
        }
    } catch { }

    // 3. Public Events (Optional context)
    try {
        const events = await db.select()
            .from(publicEvents)
            .where(and(eq(publicEvents.tenantId, tenantId), gte(publicEvents.createdAt, minDate)))
            .orderBy(desc(publicEvents.createdAt));

        for (const e of events) {
            const key = e.refToken || e.anonId;
            if (!key) continue;

            const convo = getOrInit(key, `Sessão: ${key.slice(0, 8)}`);
            if (e.refToken) convo.refToken = e.refToken;

            if (e.createdAt > convo.lastActivityAt) {
                convo.lastActivityAt = e.createdAt;
                if (convo.lastKind === 'unknown') convo.lastKind = 'event';
            }

            if (!convo.lastInboundAt || e.createdAt > convo.lastInboundAt) {
                convo.lastInboundAt = e.createdAt;
            }
        }
    } catch { }

    // Process Status and SLA
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const results = Array.from(map.values()).map(convo => {
        const lastIn = convo.lastInboundAt;
        const lastOut = convo.lastOutboundAt;
        const lastAct = convo.lastActivityAt;

        let status: ConversationStatus = 'closed';

        if (lastAct >= sevenDaysAgo) {
            if (lastIn && (!lastOut || lastIn > lastOut)) {
                status = 'open';
                convo.slaMinutes = Math.floor((now.getTime() - lastIn.getTime()) / 60000);
            } else if (lastOut && (!lastIn || lastOut > lastIn)) {
                status = 'pending';
            } else {
                status = 'open'; // default active
            }
        }

        convo.status = status;
        return convo;
    });

    // Filter by status if requested
    let filtered = results;
    if (filters?.status && filters.status !== 'all') {
        filtered = results.filter(c => c.status === filters.status);
    }

    // Sort by lastActivity DESC
    filtered.sort((a, b) => b.lastActivityAt.getTime() - a.lastActivityAt.getTime());

    // Basic string cursor pagination (simplistic slice)
    let startIndex = 0;
    if (cursor) {
        const idx = filtered.findIndex(c => c.convoId === cursor);
        if (idx !== -1) startIndex = idx + 1;
    }

    return filtered.slice(startIndex, startIndex + limit);
}
