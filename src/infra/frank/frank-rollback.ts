import { clearTenantOverride, getTenantOverride, setTenantOverride } from '@/infra/frank/frank-override-store';

export interface RollbackApplyResult {
  applied: boolean;
  previousOverride: string | null;
  newOverride: string | null;
}

export async function applyFrankRollbackOverride(
  {
    tenantId,
    baseline,
    candidate,
    dryRun,
  }: {
    tenantId: string;
    baseline: string;
    candidate: string;
    dryRun: boolean;
  },
): Promise<RollbackApplyResult> {
  const currentOverride = await getTenantOverride(tenantId);

  let newOverride: string | null;
  if (currentOverride === candidate) {
    newOverride = baseline;
  } else if (currentOverride) {
    newOverride = null;
  } else {
    newOverride = null;
  }

  let applied = false;
  if (!dryRun) {
    if (newOverride === null) {
      applied = await clearTenantOverride(tenantId, `rollback: ${candidate} -> ${baseline}`);
    } else {
      applied = await setTenantOverride(tenantId, newOverride, `rollback: ${candidate} -> ${baseline}`);
    }
  }

  return {
    applied,
    previousOverride: currentOverride || null,
    newOverride,
  };
}

