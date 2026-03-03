// ---------------------------------------------------------------------------
// Internal route: register concierge decision strategic fact.
// Called client-side (best-effort). Not public-facing.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { registerStrategicFact } from '@/core/orchestrator/orchestrator.service';
import { structuredLogger } from '@/infra/log/logger';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        const {
            correlationId,
            optionsCount,
            bestScore,
            hasTradeoff,
            scoreAverage,
        } = body as {
            correlationId?: string;
            optionsCount?: number;
            bestScore?: number;
            hasTradeoff?: boolean;
            scoreAverage?: number;
        };

        await registerStrategicFact(
            'concierge_decision_made',
            {
                source: 'public',
                correlationId: correlationId ?? undefined,
            },
            {
                optionsCount: optionsCount ?? 0,
                bestScore: bestScore ?? 0,
                hasTradeoff: hasTradeoff ?? false,
                scoreAverage: scoreAverage ?? 0,
            },
        );

        return NextResponse.json({ ok: true });
    } catch (err) {
        structuredLogger.warn('concierge_fact_route_failed', {
            error: err instanceof Error ? err.message : 'unknown',
        });
        // Always return 200 — best-effort, never break client flow
        return NextResponse.json({ ok: false });
    }
}
