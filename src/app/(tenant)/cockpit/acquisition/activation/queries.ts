import { getDb } from '@/infra/db';
import { publicEvents, tenantEvents } from '@/drizzle/schema';
import { eq, and, gte, desc, sql } from 'drizzle-orm';

export interface ActivationStats {
    totalClicks: number;
    funnel: {
        clickCta: number;
        entryStart: number;
        entrySuccess: number;
    };
    ctaClicks: {
        element: string;
        count: number;
    }[];
    mostViewedSections: {
        section: string;
        count: number;
    }[];
    sourceBreakdown: {
        source: string;
        campaign: string;
        count: number;
    }[];
}

export async function getActivationStats(days: number = 30): Promise<ActivationStats> {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);

    // Filter to only events from our public instrumentation
    const baseFilter = and(
        eq(publicEvents.tenantId, 'condstore-public'),
        gte(publicEvents.createdAt, minDate)
    );

    const db = await getDb();

    // 1. Funnel
    const funnelRes = await db
        .select({
            event: publicEvents.eventType,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, sql`${publicEvents.eventType} IN ('click_cta', 'entry_start', 'entry_success')`))
        .groupBy(publicEvents.eventType);

    const funnel = { clickCta: 0, entryStart: 0, entrySuccess: 0 };
    for (const row of funnelRes) {
        if (row.event === 'click_cta') funnel.clickCta = row.count;
        if (row.event === 'entry_start') funnel.entryStart = row.count;
        if (row.event === 'entry_success') funnel.entrySuccess = row.count;
    }

    // 2. CTA Clicks
    const ctaRes = await db
        .select({
            element: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.element'))`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, eq(publicEvents.eventType, 'click_cta')))
        .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.element'))`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    // 3. Most viewed sections
    const sectionRes = await db
        .select({
            section: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.section'))`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, eq(publicEvents.eventType, 'view_section')))
        .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.section'))`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    // 4. Source Breakdown (where utmSource IS NOT NULL via attribution if needed, simplified for schema change)
    const sourceRes = await db
        .select({
            source: sql<string>`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.utmSource')), 'direct')`,
            campaign: sql<string>`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.utmCampaign')), '(none)')`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(
            baseFilter,
            eq(publicEvents.eventType, 'click_cta')
        ))
        .groupBy(sql`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.utmSource')), 'direct')`, sql`COALESCE(JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.payloadJson}, '$.utmCampaign')), '(none)')`)
        .orderBy(desc(sql`count(*)`))
        .limit(20);

    return {
        totalClicks: funnel.clickCta,
        funnel,
        ctaClicks: ctaRes.map((x: any) => ({ element: x.element || 'unknown', count: x.count })),
        mostViewedSections: sectionRes.map((x: any) => ({ section: x.section || 'unknown', count: x.count })),
        sourceBreakdown: sourceRes.map((x: any) => ({ source: x.source, campaign: x.campaign, count: x.count })),
    };
}

export async function getTtvMetrics(days: number = 30) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() - days);

    const db = await getDb();

    // MySQL query for TTV: difference in seconds between 'entry_success' (or fallback to 'signup_created') 
    // and 'first_freight_simulation' for the same tenant.
    // The prompt requested min(ts(first_freight_simulation)) - min(ts(entry_success)).
    // entry_success is logged inside public_events but without proper tenant linkage (only ref_token / anonId).
    // Thus, we use 'signup_created' which safely mirrors tenant creation in tenant_events.

    const query = sql`
        SELECT 
            sim.tenant_id,
            TIMESTAMPDIFF(SECOND, MIN(signup.created_at), MIN(sim.created_at)) as diff_sec
        FROM tenant_events sim
        JOIN tenant_events signup ON sim.tenant_id = signup.tenant_id
        WHERE sim.type = 'first_freight_simulation' 
          AND signup.type = 'signup_created'
          AND sim.created_at >= ${minDate}
        GROUP BY sim.tenant_id
        HAVING diff_sec >= 0
    `;

    const data = await db.execute(query);
    const rows = (data as any)[0] || [];

    const diffs = rows.map((r: any) => Number(r.diff_sec)).sort((a: number, b: number) => a - b);

    let p50 = 0;
    let p90 = 0;
    if (diffs.length > 0) {
        p50 = diffs[Math.floor(diffs.length * 0.5)];
        p90 = diffs[Math.floor(diffs.length * 0.9)];
    }

    return {
        p50Seconds: p50,
        p90Seconds: p90,
        sampleSize: diffs.length
    };
}
