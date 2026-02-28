import { getDb } from '@/infra/db';
import { publicEvents } from '@/drizzle/schema';
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
            event: publicEvents.event,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, sql`${publicEvents.event} IN ('click_cta', 'entry_start', 'entry_success')`))
        .groupBy(publicEvents.event);

    const funnel = { clickCta: 0, entryStart: 0, entrySuccess: 0 };
    for (const row of funnelRes) {
        if (row.event === 'click_cta') funnel.clickCta = row.count;
        if (row.event === 'entry_start') funnel.entryStart = row.count;
        if (row.event === 'entry_success') funnel.entrySuccess = row.count;
    }

    // 2. CTA Clicks
    const ctaRes = await db
        .select({
            element: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.props}, '$.element'))`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, eq(publicEvents.event, 'click_cta')))
        .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.props}, '$.element'))`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    // 3. Most viewed sections
    const sectionRes = await db
        .select({
            section: sql<string>`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.props}, '$.section'))`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(baseFilter, eq(publicEvents.event, 'view_section')))
        .groupBy(sql`JSON_UNQUOTE(JSON_EXTRACT(${publicEvents.props}, '$.section'))`)
        .orderBy(desc(sql`count(*)`))
        .limit(10);

    // 4. Source Breakdown (where utmSource IS NOT NULL)
    const sourceRes = await db
        .select({
            source: sql<string>`COALESCE(${publicEvents.utmSource}, 'direct')`,
            campaign: sql<string>`COALESCE(${publicEvents.utmCampaign}, '(none)')`,
            count: sql<number>`cast(count(*) as unsigned)`,
        })
        .from(publicEvents)
        .where(and(
            baseFilter,
            eq(publicEvents.event, 'click_cta')
        ))
        .groupBy(sql`COALESCE(${publicEvents.utmSource}, 'direct')`, sql`COALESCE(${publicEvents.utmCampaign}, '(none)')`)
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
