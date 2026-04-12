import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { tudicoRuntimeService } from '@/modules/cockpit/tudico/tudico-runtime.service';

export async function POST(req: NextRequest) {
  const requestId = makeRequestId(req);
  try {
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    const payload = await req.json();
    const data = await tudicoRuntimeService.auditResponse(payload);
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_audit_response_failed', { requestId, route: '/api/cockpit/tudico/audit-response', error });
    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid audit payload');
  }
}
