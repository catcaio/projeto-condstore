import { SubscriptionRecord } from './types';

export async function fetchSubscription(): Promise<SubscriptionRecord | { status: 'none' }> {
    try {
        const response = await fetch('/api/billing/subscription', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
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
