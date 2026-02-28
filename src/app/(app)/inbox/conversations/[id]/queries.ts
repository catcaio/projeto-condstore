import { getDb } from '@/infra/db';
import { sql, eq, or, and, desc, asc } from 'drizzle-orm';
import {
    messages,
    publicEvents,
    freightFunnelEvents,
    freightSimulationLogs,
    tenantEvents
} from '@/drizzle/schema';

export type TimelineEventKind = 'message' | 'webhook' | 'public_event' | 'funnel' | 'freight';

export type TimelineEvent = {
    id: string;
    kind: TimelineEventKind;
    direction?: string;
    status?: string;
    title: string;
    body?: string;
    createdAt: Date;
    meta?: any;
};

export type ConversationHeader = {
    title: string;
    subtitle?: string;
    contactKey?: string;
    refToken?: string;
    firstAt: Date | null;
    lastAt: Date | null;
    utm?: {
        source?: string;
        medium?: string;
        campaign?: string;
    };
};

export async function getConversationTimeline(tenantId: string, id: string, limit: number = 120): Promise<TimelineEvent[]> {
    const db = await getDb();
    const items: TimelineEvent[] = [];

    // The ID could be a phone number (contactKey), a refToken, or a single raw ID.
    // Try to find matches across tables for this identifier.

    const fetchMessages = async () => {
        try {
            const res = await db.select()
                .from(messages)
                .where(and(
                    eq(messages.tenantId, tenantId),
                    or(
                        eq(messages.fromPhone, id),
                        eq(messages.toPhone, id),
                        eq(messages.messageSid, id)
                    )
                ))
                .orderBy(asc(messages.createdAt))
                .limit(limit);

            res.forEach(m => {
                items.push({
                    id: m.messageSid,
                    kind: 'message',
                    title: m.direction === 'inbound' ? 'Mensagem Recebida' : 'Mensagem Enviada',
                    direction: m.direction,
                    status: m.direction,
                    body: m.body || undefined,
                    createdAt: m.createdAt,
                    meta: { intent: m.intent, phone: m.fromPhone === id ? m.fromPhone : m.toPhone }
                });
            });
        } catch { }
    };

    const fetchFunnelEvents = async () => {
        try {
            const res = await db.select()
                .from(freightFunnelEvents)
                .where(and(
                    eq(freightFunnelEvents.tenantId, tenantId),
                    or(
                        eq(freightFunnelEvents.phoneNumber, id),
                        eq(freightFunnelEvents.refToken, id),
                        eq(freightFunnelEvents.sessionId, id),
                        eq(freightFunnelEvents.id, id)
                    )
                ))
                .orderBy(asc(freightFunnelEvents.createdAt))
                .limit(limit);

            res.forEach(f => {
                items.push({
                    id: f.id,
                    kind: 'funnel',
                    title: 'Funil: ' + f.stage,
                    status: f.stage,
                    createdAt: f.createdAt,
                    meta: {
                        phone: f.phoneNumber,
                        utmSource: f.utmSource,
                        utmCampaign: f.utmCampaign,
                        refToken: f.refToken
                    }
                });
            });
        } catch { }
    };

    const fetchSimulationLogs = async () => {
        try {
            const res = await db.select()
                .from(freightSimulationLogs)
                .where(and(
                    eq(freightSimulationLogs.tenantId, tenantId),
                    or(
                        eq(freightSimulationLogs.refToken, id),
                        eq(freightSimulationLogs.id, id)
                    )
                ))
                .orderBy(asc(freightSimulationLogs.createdAt))
                .limit(limit);

            res.forEach(sim => {
                items.push({
                    id: sim.id,
                    kind: 'freight',
                    title: 'Simulação de Frete',
                    status: Number(sim.valor) > 0 ? 'success' : 'failed',
                    body: `Destino: ${sim.uf} - ${Number(sim.peso).toFixed(2)}kg - Prazo: ${sim.prazo}d - R$${Number(sim.valor).toFixed(2)}`,
                    createdAt: sim.createdAt,
                    meta: {
                        uf: sim.uf,
                        cepHash: sim.cepHash,
                        utmSource: sim.utmSource,
                        utmCampaign: sim.utmCampaign
                    }
                });
            });
        } catch { }
    };

    const fetchPublicEvents = async () => {
        try {
            const res = await db.select()
                .from(publicEvents)
                .where(and(
                    eq(publicEvents.tenantId, tenantId),
                    or(
                        eq(publicEvents.anonId, id),
                        eq(publicEvents.id, id)
                    )
                ))
                .orderBy(asc(publicEvents.createdAt))
                .limit(limit);

            res.forEach(p => {
                items.push({
                    id: p.id,
                    kind: 'public_event',
                    title: p.event,
                    body: p.path,
                    createdAt: p.createdAt,
                });
            });
        } catch { }
    };

    const fetchTenantEvents = async () => {
        try {
            const res = await db.select()
                .from(tenantEvents)
                .where(and(
                    eq(tenantEvents.tenantId, tenantId),
                    eq(tenantEvents.id, id) // Probably only matches explicitly on ID
                ))
                .orderBy(asc(tenantEvents.createdAt))
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

    await Promise.all([
        fetchMessages(),
        fetchFunnelEvents(),
        fetchSimulationLogs(),
        fetchPublicEvents(),
        fetchTenantEvents()
    ]);

    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    return items.slice(0, limit);
}

export async function getConversationHeader(tenantId: string, id: string): Promise<ConversationHeader> {
    const timeline = await getConversationTimeline(tenantId, id, 100);

    if (timeline.length === 0) {
        return {
            title: 'Não encontrado',
            firstAt: null,
            lastAt: null
        };
    }

    const firstItem = timeline[0];
    const lastItem = timeline[timeline.length - 1];

    let contactKey: string | undefined;
    let refToken: string | undefined;
    let title = `Thread do Evento`;
    let subtitle = `ID base: ${id}`;
    let utmSource, utmMedium, utmCampaign;

    // Scan timeline to extract identifiers and attribution
    for (const item of timeline) {
        if (!contactKey && item.meta?.phone) contactKey = item.meta.phone;
        if (!refToken && item.meta?.refToken) refToken = item.meta.refToken;
        if (!utmSource && item.meta?.utmSource) utmSource = item.meta.utmSource;
        if (!utmCampaign && item.meta?.utmCampaign) utmCampaign = item.meta.utmCampaign;
    }

    if (contactKey) {
        title = contactKey;
        subtitle = 'Contato Identificado';
    } else if (refToken) {
        title = `Token: ${refToken.slice(0, 8)}...`;
        subtitle = 'Sessão Web Tracker';
    }

    return {
        title,
        subtitle,
        contactKey,
        refToken,
        firstAt: firstItem.createdAt,
        lastAt: lastItem.createdAt,
        utm: (utmSource || utmCampaign) ? {
            source: utmSource,
            campaign: utmCampaign,
            medium: utmMedium
        } : undefined
    };
}
