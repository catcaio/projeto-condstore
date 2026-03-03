// ---------------------------------------------------------------------------
// Cockpit API: Concierge performance stats (24h window).
// Reads from public_events table for events matching "orchestrator:concierge_decision_made".
// ---------------------------------------------------------------------------

import { NextResponse } from 'next/server';
import { getServerSessionUser } from '@/infra/auth/session';
import { getDb } from '@/infra/db';
import { publicEvents } from '@/drizzle/schema';
import { sql, eq, and, gte } from 'drizzle-orm';
import { structuredLogger } from '@/infra/log/logger';

export async function GET() {
    try {
        const session = await getServerSessionUser();
        if (!session || session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const db = await getDb();
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const rows = await db
            .select({
                payloadJson: publicEvents.payloadJson,
                createdAt: publicEvents.createdAt,
            })
            .from(publicEvents)
            .where(
                and(
                    eq(publicEvents.eventType, 'orchestrator:concierge_decision_made'),
                    gte(publicEvents.createdAt, since),
                ),
            )
            .orderBy(sql`${publicEvents.createdAt} DESC`)
            .limit(500);

        if (rows.length === 0) {
            return NextResponse.json({
                totalDecisions: 0,
                avgScore: 0,
                tradeoffPct: 0,
                lastEventAt: null,
            });
        }

        let totalScore = 0;
        let tradeoffCount = 0;

        for (const row of rows) {
            const payload = row.payloadJson as Record<string, unknown> | null;
            if (payload) {
                totalScore += (payload['bestScore'] as number) || 0;
                if (payload['hasTradeoff']) tradeoffCount++;
            }
        }

        return NextResponse.json({
            totalDecisions: rows.length,
            avgScore: totalScore / rows.length,
            tradeoffPct: (tradeoffCount / rows.length) * 100,
            lastEventAt: rows[0].createdAt,
        });
    } catch (err) {
        structuredLogger.warn('concierge_stats_route_failed', {
            error: err instanceof Error ? err.message : 'unknown',
        });
        return NextResponse.json({
            totalDecisions: 0,
            avgScore: 0,
            tradeoffPct: 0,
            lastEventAt: null,
        });
    }
}
