import { getBillingSummary } from '../cockpit/queries';
import { getAttributionSummary } from '../attribution/queries';
import { getInboxConversations } from '@/modules/conversas/queries';

export async function getHomeFinancialSnapshot(tenantId: string) {
    const billing = await getBillingSummary(tenantId);

    const currentMonthUsd = billing.budget.currentUsd || 0;
    const monthlyBudgetUsd = billing.budget.monthlyUsd || 0;

    return {
        state: billing.budget.state,
        planId: billing.planId || 'free',
        currentMonthUsd,
        monthlyBudgetUsd,
        usagePercent: monthlyBudgetUsd > 0 ? (currentMonthUsd / monthlyBudgetUsd) * 100 : 0
    };
}

export async function getHomeAttributionSnapshot(tenantId: string) {
    const items = await getAttributionSummary(tenantId, 7, 'utmSource');
    return items.length > 0 ? items[0] : null; // Already sorted desc by simulations
}

export async function getHomeInboxSnapshot(tenantId: string) {
    const ev = await getInboxConversations(tenantId, 5, undefined, { rangeDays: 7 });

    // Naive fetch for counts, can be optimized later
    const all = await getInboxConversations(tenantId, 100, undefined, { rangeDays: 7 });
    const openCount = all.filter((c: any) => c.status === 'open').length;
    const pendingCount = all.filter((c: any) => c.status === 'pending').length;

    return {
        openCount,
        pendingCount,
        recentActivity: ev
    };
}
