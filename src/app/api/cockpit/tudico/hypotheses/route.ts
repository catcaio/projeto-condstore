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

    const data = await tudicoRuntimeService.listHypothesisVersions(auth.session.tenantId);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_hypotheses_list_failed', { requestId, route: '/api/cockpit/tudico/hypotheses', error });
    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to list hypothesis versions');
  }
}

export async function POST(req: NextRequest) {
  const requestId = makeRequestId(req);
  try {
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    const payload = await req.json();
    const data = await tudicoRuntimeService.createHypothesisVersion(auth.session.tenantId, auth.session.sub, payload);

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    structuredLogger.error('tudico_hypothesis_create_failed', { requestId, route: '/api/cockpit/tudico/hypotheses', error });
    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid hypothesis payload');
  }
}
