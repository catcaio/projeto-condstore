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
    const fromId = searchParams.get('fromId');
    const toId = searchParams.get('toId');

    if (!fromId || !toId) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'fromId and toId are required');
    }

    const data = await tudicoRuntimeService.compareHypothesisVersions(auth.session.tenantId, fromId, toId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_hypothesis_compare_failed', { requestId, route: '/api/cockpit/tudico/hypotheses/compare', error });
    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to compare versions');
  }
}
