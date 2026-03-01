import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/infra/auth/session";
import { getDb } from "@/infra/db";
import { sql } from "drizzle-orm";
import { freightFunnelEvents } from "@/drizzle/schema";

export const runtime = "nodejs";

import { requireAdmin } from '@/infra/auth/guards';

export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;

    try {
        const db = await getDb();

        // webhook_5xx_last_15m (Logs are in Datadog/Vercel normally, 
        // but if we were storing them in DB we'd count them. 
        // Assuming 0 for now as we don't persist 5xx locally).
        const webhook_5xx_last_15m = 0;

        // sessions_started_last_24h
        const [startedResult] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM freight_funnel_events 
      WHERE stage = 'FLOW_STARTED' 
      AND created_at >= NOW() - INTERVAL 1 DAY
    `);
        const sessions_started_last_24h = Number((startedResult as any)[0]?.count || 0);

        // sessions_aborted_last_24h
        const [abortedResult] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM freight_funnel_events 
      WHERE stage = 'FLOW_ABORTED' 
      AND created_at >= NOW() - INTERVAL 1 DAY
    `);
        const sessions_aborted_last_24h = Number((abortedResult as any)[0]?.count || 0);

        // funnel_conversion_last_24h
        const [quotedResult] = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM freight_funnel_events 
      WHERE stage = 'FREIGHT_QUOTED' 
      AND created_at >= NOW() - INTERVAL 1 DAY
    `);
        const quotesSent = Number((quotedResult as any)[0]?.count || 0);

        // Funnel Conversion = (Quotes Sent / Flow Started) * 100
        const funnel_conversion_last_24h = sessions_started_last_24h > 0
            ? ((quotesSent / sessions_started_last_24h) * 100).toFixed(2) + '%'
            : '0.00%';

        return NextResponse.json({
            webhook_5xx_last_15m,
            funnel_conversion_last_24h,
            sessions_started_last_24h,
            sessions_aborted_last_24h,
        });

    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
