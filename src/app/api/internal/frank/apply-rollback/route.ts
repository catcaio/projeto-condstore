export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { logger } from '@/infra/logger';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { withRequestTrace, getTracedRequestId } from '@/infra/http/request-trace';
import { gateEvaluate } from '@/infra/frank/frank-gate';
import { applyFrankRollbackOverride } from '@/infra/frank/frank-rollback';
import { applyFrankInternalRateLimit } from '@/infra/security/frank-rate-limit';

interface RollbackBody {
  tenantId?: string;
  baseline?: string;
  candidate?: string;
  sinceHours?: number;
  dryRun?: boolean;
}

interface RollbackResponse {
  ok: true;
  applied: boolean;
  previousOverride: string | null;
  newOverride: string | null;
  decision: string;
  reasons: string[];
  dryRun: boolean;
  timestamp: string;
}

async function handler(request: NextRequest): Promise<NextResponse> {
  const authResult = requireInternalToken(request, { purpose: ['export', 'diag'] });
  if (!authResult.ok) return authResult.response;

  let body: RollbackBody;
  try {
    body = (await request.json()) as RollbackBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const tenantId = body.tenantId?.trim();
  if (!tenantId) {
    return NextResponse.json(
      { ok: false, error: 'tenantId is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const requestId = getTracedRequestId(request) ?? '';
  const rl = await applyFrankInternalRateLimit({ tenantId, requestId, route: '/api/internal/frank/apply-rollback' });
  if (rl.blocked) return rl.response;

  const baseline = body.baseline?.trim();
  if (!baseline) {
    return NextResponse.json(
      { ok: false, error: 'baseline model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const candidate = body.candidate?.trim();
  if (!candidate) {
    return NextResponse.json(
      { ok: false, error: 'candidate model version is required', timestamp: new Date().toISOString() },
      { status: 400 },
    );
  }

  const sinceHours = Math.max(1, Number.parseInt(String(body.sinceHours || '24'), 10));
  const dryRun = body.dryRun === true;

  try {
    const db = await getDb();
    const { decision, reasons } = await gateEvaluate(db, { tenantId, baseline, candidate, sinceHours });

    // Only proceed with rollback if gate FAILED
    if (decision !== 'FAIL') {
      logger.info('frank_rollback_rejected', {
        tenantId,
        baseline,
        candidate,
        decision,
        reason: `gate_decision_${decision}`,
      });

      return NextResponse.json(
        {
          ok: false,
          error: `Cannot rollback: gate decision is ${decision}, not FAIL`,
          timestamp: new Date().toISOString(),
        },
        { status: 400 },
      );
    }

    const rollbackResult = await applyFrankRollbackOverride({ tenantId, baseline, candidate, dryRun });
    const applied = rollbackResult.applied;

    const response: RollbackResponse = {
      ok: true,
      applied: applied || dryRun, // Consider dryRun as "applied" (just not persisted)
      previousOverride: rollbackResult.previousOverride,
      newOverride: rollbackResult.newOverride,
      decision,
      reasons,
      dryRun,
      timestamp: new Date().toISOString(),
    };

    logger.info('frank_rollback_applied', {
      tenantId,
      baseline,
      candidate,
      previousOverride: rollbackResult.previousOverride,
      newOverride: rollbackResult.newOverride,
      dryRun,
      applied,
    });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('frank_rollback_failed', error instanceof Error ? error : new Error(String(error)), {
      tenantId,
      baseline,
      candidate,
      sinceHours,
    });

    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to apply rollback',
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export const POST = withRequestTrace(handler);
