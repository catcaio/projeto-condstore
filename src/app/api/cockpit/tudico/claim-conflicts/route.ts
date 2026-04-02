import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { tudicoRuntimeService } from '@/modules/cockpit/tudico/tudico-runtime.service';

export async function GET(req: NextRequest) {
  const requestId = makeRequestId(req);
  try {
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(req.url);
    const claimId = searchParams.get('claimId') ?? undefined;

    const data = await tudicoRuntimeService.listClaimConflicts(auth.session.tenantId, claimId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_claim_conflicts_failed', { requestId, route: '/api/cockpit/tudico/claim-conflicts', error });
    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to list claim conflicts');
  }
}
