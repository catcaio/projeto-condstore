import { getAllSubscriptions } from '../billing/subscriptionStore';
import { planData } from '../../../components/pricing/planData';

export interface BillingMetrics {
    activeCount: number;
    trialingCount: number;
    canceledCount: number;
    mrr: number;             // Monthly Recurring Revenue
    arpu: number;            // Average Revenue Per User
    newLast30Days: number;   // New subscriptions in last 30 days
    churnRate: number;       // Percentage of canceled vs total
    totalCurrent: number;    // active + trialing
}

export async function computeBillingMetrics(): Promise<BillingMetrics> {
    const subscriptions = await getAllSubscriptions();

    let activeCount = 0;
    let trialingCount = 0;
    let canceledCount = 0;
    let newLast30Days = 0;
    let mrr = 0;

    const thirtyDaysAgo = Math.floor(Date.now() / 1000) - (30 * 24 * 60 * 60);

    for (const sub of subscriptions) {
        if (sub.status === 'active') {
            activeCount++;
        } else if (sub.status === 'trialing') {
            trialingCount++;
        } else if (sub.status === 'canceled') {
            canceledCount++;
        }

        // Count new subscriptions in last 30 days. We use updatedAt assuming that's close to creation time 
        // in a simple mock. In a robust system we'd use a dedicated 'createdAt'.
        if (sub.updatedAt >= thirtyDaysAgo && ['active', 'trialing'].includes(sub.status)) {
            newLast30Days++;
        }

        if (['active', 'trialing'].includes(sub.status)) {
            const plan = planData.find((p: any) => p.id === sub.planId);
            if (plan) {
                // Extract numeric value from "R$ 149/mês"
                const priceMatch = plan.price.match(/\d+(\.\d+)?/);
                if (priceMatch) {
                    mrr += parseFloat(priceMatch[0]);
                }
            }
        }
    }

    const totalCurrent = activeCount + trialingCount;
    const totalEver = totalCurrent + canceledCount;

    const arpu = totalCurrent > 0 ? mrr / totalCurrent : 0;
    const churnRate = totalEver > 0 ? (canceledCount / totalEver) * 100 : 0;

    return {
        activeCount,
        trialingCount,
        canceledCount,
        mrr,
        arpu,
        newLast30Days,
        churnRate,
        totalCurrent
    };
}
