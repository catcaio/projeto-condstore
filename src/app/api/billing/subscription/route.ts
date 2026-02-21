import { NextRequest, NextResponse } from 'next/server';
import { getSubscription } from '../../../../lib/billing/subscriptionStore';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
        return NextResponse.json(
            { error: 'userId is required' },
            { status: 400 }
        );
    }

    try {
        const subscription = await getSubscription(userId);

        if (!subscription) {
            return NextResponse.json({ status: 'none' });
        }

        return NextResponse.json(subscription);
    } catch (error: any) {
        console.error('Failed to fetch billing subscription:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
