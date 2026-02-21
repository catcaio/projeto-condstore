import { SubscriptionRecord } from './types';

export async function fetchSubscription(userId: string): Promise<SubscriptionRecord | { status: 'none' }> {
    if (!userId) {
        return { status: 'none' };
    }

    try {
        const response = await fetch(`/api/billing/subscription?userId=${encodeURIComponent(userId)}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        });

        if (!response.ok) {
            console.error('Failed to fetch subscription data');
            return { status: 'none' };
        }

        const data = await response.json();

        if (!data || data.status === 'none') {
            return { status: 'none' };
        }

        return data as SubscriptionRecord;
    } catch (error) {
        console.error('Network error fetching subscription:', error);
        return { status: 'none' };
    }
}
