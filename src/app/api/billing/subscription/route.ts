import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/infra/auth/session';
import { getDb } from '@/infra/db';
import { tenants } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { makeRequestId } from '@/infra/http/request-trace';

export async function GET(req: NextRequest) {
    // ── Auth: tenantId MUST come from the verified session, never from query params ──
    const session = await getSessionUser(req);
    if (!session?.tenantId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const tenantId = session.tenantId;

    try {
        const db = await getDb();
        const results = await db.select({
            stripeCustomerId: tenants.stripeCustomerId,
            stripeSubscriptionId: tenants.stripeSubscriptionId,
            plan: tenants.plan,
            planStatus: tenants.planStatus,
            planCurrentPeriodEnd: tenants.planCurrentPeriodEnd
        }).from(tenants).where(eq(tenants.id, tenantId));

        const cookieOptions = {
            path: '/',
            maxAge: 86400,
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
        };

        if (results.length === 0 || !results[0].planStatus) {
            const res = NextResponse.json({ status: 'none', plan: results[0]?.plan || 'FREE' });
            res.cookies.set('entitled', '0', cookieOptions);
            return res;
        }

        const subscription = results[0];
        const isEntitled = ['active', 'trialing'].includes(subscription.planStatus || '');

        // Match the expected response shape of the frontend
        const res = NextResponse.json({
            status: subscription.planStatus,
            planId: subscription.plan?.toLowerCase() || 'free',
            stripeCustomerId: subscription.stripeCustomerId,
            currentPeriodEnd: subscription.planCurrentPeriodEnd ? Math.floor(subscription.planCurrentPeriodEnd.getTime() / 1000) : 0
        });

        res.cookies.set('entitled', isEntitled ? '1' : '0', cookieOptions);
        return res;
    } catch (error: any) {
        const requestId = makeRequestId(req);
        logger.error('Failed to fetch billing subscription', error as Error, { tenantId, requestId });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
