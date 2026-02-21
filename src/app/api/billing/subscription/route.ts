import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '../../../../lib/billing/subscriptionStore';
import { getSessionUser } from '../../../../infra/auth/session';

export async function GET(req: NextRequest) {
    // ── Auth: userId MUST come from the verified session, never from query params ──
    const session = await getSessionUser(req);
    if (!session?.sub) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = session.sub;

    try {
        const subscription = await getSubscription(userId);

        const cookieOptions = {
            path: '/',
            maxAge: 86400,
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production',
        };

        if (!subscription) {
            const res = NextResponse.json({ status: 'none' });
            res.cookies.set('entitled', '0', cookieOptions);
            return res;
        }

        const isEntitled = ['active', 'trialing'].includes(subscription.status);
        const res = NextResponse.json(subscription);
        res.cookies.set('entitled', isEntitled ? '1' : '0', cookieOptions);
        return res;
    } catch (error: any) {
        console.error('Failed to fetch billing subscription:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
