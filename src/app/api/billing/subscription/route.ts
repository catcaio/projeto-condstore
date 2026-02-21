import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '../../../../lib/billing/subscriptionStore';
import { verify } from '../../../../lib/auth/jwt';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session')?.value;
    const decoded = verify(sessionToken || '');

    if (!decoded || !decoded.userId) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        );
    }

    const userId = decoded.userId;

    try {
        const subscription = await getSubscription(userId);

        const cookieOptions = {
            path: '/',
            maxAge: 86400,
            httpOnly: true,
            sameSite: 'lax' as const,
            secure: process.env.NODE_ENV === 'production'
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
