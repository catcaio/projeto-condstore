import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { structuredLogger } from '@/infra/log/logger';
import { tudicoRuntimeService } from '@/modules/cockpit/tudico/tudico-runtime.service';

const toolSchema = z.object({
  tool: z.enum([
    'audit_response',
    'log_inconsistency',
    'compare_hypothesis_versions',
    'list_paper_cards',
    'get_paper_card',
    'list_claim_conflicts',
    'validate_statistical_signal',
  ]),
  input: z.record(z.string(), z.unknown()).default({}),
});

export async function POST(req: NextRequest) {
  const requestId = makeRequestId(req);
  try {
    const auth = await requireAdmin(req, { requestId });
    if (!auth.ok) return auth.response;

    const payload = toolSchema.parse(await req.json());
    const data = await tudicoRuntimeService.executeTool(auth.session.tenantId, auth.session.sub, payload.tool, payload.input);

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    structuredLogger.error('tudico_tool_execution_failed', { requestId, route: '/api/cockpit/tudico/tools', error });
    return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Failed to execute Tudico tool');
  }
}
