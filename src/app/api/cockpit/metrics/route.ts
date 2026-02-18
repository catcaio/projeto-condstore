import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cockpit/metrics
 * Returns key metrics for the Cockpit Dashboard.
 * 
 * Headers:
 * - x-tenant-id (Required)
 * 
 * Response:
 * - 200 OK: { mensagensHoje: number, cotacoesHoje: number, pedidosHoje: number, erros24h: number }
 * - 400 Bad Request: { error: "Missing tenant" }
 */
export async function GET(request: NextRequest) {
    // 1. Read tenantId from header (injected by middleware)
    const tenantId = request.headers.get('x-tenant-id');

    if (!tenantId) {
        return NextResponse.json(
            { error: 'Missing tenant' },
            { status: 400 }
        );
    }

    // 2. Fetch Metrics (Mocked for now, structure ready for DB/Cache)
    // TODO: Replace with real DB queries using tenantId

    // Simulation of varying data for realism
    const hour = new Date().getHours();

    const metrics = {
        mensagensHoje: 1248 + (hour * 12),
        cotacoesHoje: 86 + (hour * 2),
        pedidosHoje: 24 + Math.floor(hour / 2),
        erros24h: 0
    };

    // 3. Cache Control (No Redis available in current limitations, skipping)
    // If Redis was available: await redis.set(`cockpit:metrics:${tenantId}`, JSON.stringify(metrics), 'EX', 30);

    return NextResponse.json(metrics, {
        status: 200,
        headers: {
            'Cache-Control': 'no-store' // Dynamic data
        }
    });
}
