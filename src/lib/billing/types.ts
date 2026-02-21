export type SubscriptionStatus =
    | 'active'
    | 'trialing'
    | 'past_due'
    | 'canceled'
    | 'incomplete'
    | 'incomplete_expired'
    | 'unpaid'
    | 'paused';

export interface SubscriptionRecord {
    userId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    stripePriceId: string;
    planId: string;
    status: SubscriptionStatus;
    currentPeriodEnd: number; // unix timestamp
    cancelAtPeriodEnd: boolean;
    updatedAt: number; // unix timestamp
}
