export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { respondInfraError } from '@/infra/http/infra-error';
import { getTracedRequestId, withRequestTrace } from '@/infra/http/request-trace';
import { listOverrides } from '@/infra/frank/frank-override-store';
import { gateEvaluate } from '@/infra/frank/frank-gate';
import { applyFrankRollbackOverride } from '@/infra/frank/frank-rollback';
import { insertDecision } from '@/infra/frank/frank-rollout-decisions.repository';
import { getActiveFrankModel } from '@/core/ai/model-registry';

type SchedulerBody = {
  sinceHours?: number;
  dryRun?: boolean;
};

async function handler(request: NextRequest): Promise<NextResponse> {
  const authResult = requireInternalToken(request, { purpose: ['jobs', 'export', 'diag'] });
  if (!authResult.ok) return authResult.response;

  let body: SchedulerBody = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      body = (await request.json()) as SchedulerBody;
    }
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const sinceHours = Math.max(1, Number.parseInt(String(body?.sinceHours ?? '24'), 10) || 24);
  const dryRun = body?.dryRun !== false;
  const requestId = getTracedRequestId(request) ?? '';

  try {
    const overrides = await listOverrides();
    const baselineFallback = getActiveFrankModel().id;
    const db = await getDb();

    let evaluated = 0;
    let failed = 0;
    let rolledBack = 0;
    let decisionsSaved = 0;

    for (const override of overrides) {
      const tenantId = override.tenantId;
      const candidate = override.candidateVersionId;
      const baseline = override.baselineVersionId ?? baselineFallback;

      const result = await gateEvaluate(db, { tenantId, baseline, candidate, sinceHours });
      evaluated += 1;
      if (result.decision === 'FAIL') failed += 1;

      let applied = false;
      if (result.decision === 'FAIL' && !dryRun) {
        const rollback = await applyFrankRollbackOverride({ tenantId, baseline, candidate, dryRun: false });
        applied = rollback.applied;
        if (applied) rolledBack += 1;
      }

      await insertDecision(db, {
        tenantId,
        baseline,
        candidate,
        decision: result.decision,
        applied,
        dryRun,
        reasonsJson: result.reasons,
        metricsJson: result.metrics,
        requestId,
      });
      decisionsSaved += 1;

      logger.info('frank_scheduler_tenant_evaluated', {
        requestId,
        tenantId,
        baseline,
        candidate,
        sinceHours,
        decision: result.decision,
        applied,
        dryRun,
      });
    }

    return NextResponse.json({
      ok: true,
      sinceHours,
      dryRun,
      totalTenants: overrides.length,
      evaluated,
      failed,
      rolledBack,
      decisionsSaved,
    });
  } catch (err) {
    return respondInfraError(err, requestId);
  }
}

export const POST = withRequestTrace(handler);
