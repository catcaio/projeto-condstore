import { NextRequest, NextResponse } from 'next/server';
import { computeBillingMetrics } from '../../../../lib/metrics/billingMetrics';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const adminKey = req.headers.get('x-admin-key');
    const expectedKey = process.env.ADMIN_SECRET;

    if (!expectedKey || adminKey !== expectedKey) {
        return NextResponse.json(
            { error: 'Unauthorized: Invalid or missing x-admin-key' },
            { status: 401 }
        );
    }

    try {
        const metrics = await computeBillingMetrics();
        return NextResponse.json(metrics);
    } catch (error: any) {
        console.error('Failed to compute admin metrics:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
