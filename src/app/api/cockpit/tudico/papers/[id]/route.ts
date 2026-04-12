import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { tudicoRuntimeService } from '@/modules/cockpit/tudico/tudico-runtime.service';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = makeRequestId(req);
  try {
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const data = await tudicoRuntimeService.getPaperCard(auth.session.tenantId, auth.session.sub, id);

    if (!data) {
      return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Paper card not found');
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_paper_get_failed', { requestId, route: '/api/cockpit/tudico/papers/[id]', error });
    return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to get paper card');
  }
}
