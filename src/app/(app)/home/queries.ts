import { getBillingSummary } from '../cockpit/queries';
import { getAttributionSummary } from '../attribution/queries';
import { getInboxItems } from '../inbox/queries';

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
    return getInboxItems(tenantId, 10);
}
