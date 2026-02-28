import * as React from 'react';
import { getTenantState, type TenantLockState } from '@/core/ai/tenant-state-resolver';
import { FinOpsStatusUI, type FinOpsStatus } from './finops-status-ui';

export async function FinOpsStatusBar({ tenantId }: { tenantId: string }) {
    if (!tenantId) return null;

    try {
        const result = await getTenantState(tenantId);
        // TenantLockState vs FinOpsStatus
        // TenantLockState: 'unlocked' | 'degraded' | 'degraded_preemptive' | 'locked'
        return <FinOpsStatusUI status={result.state as FinOpsStatus} />;
    } catch {
        // Fail-open UI (don't break app shell if DB/Redis goes down completely)
        return null; // Equivalent to 'unlocked' visually
    }
}
