import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { frankExecutionStateService } from '@/modules/frank/frank-execution-state.service';
import { frankObserverService } from '@/modules/frank/frank-observer.service';

export async function GET(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;
    const executionId = request.nextUrl.searchParams.get('executionId')?.trim() || undefined;

    try {
        if (executionId) {
            const details = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
            const res = NextResponse.json({ success: true, details }, { status: 200 });
            attachRequestIdHeader(res, requestId);
            return res;
        }

        const res = NextResponse.json({
            success: true,
            status: 'ACTIVE_SUPERVISOR',
            timestamp: new Date().toISOString()
        }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to fetch Frank supervisor state');
    }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const tenantId = auth.session.tenantId;

    try {
        const body = await request.json();
        const { action, payload } = body;

        if (action === 'OBSERVE_SIGNAL') {
            const executionId = await frankObserverService.observeSignal({
                tenantId,
                signalType: payload.signalType,
                domain: payload.domain || 'operations',
                severity: payload.severity || 'MEDIUM',
                summary: payload.summary,
                evidence: payload.evidence || {}
            });
            const res = NextResponse.json({ success: true, executionId }, { status: 200 });
            attachRequestIdHeader(res, requestId);
            return res;
        }

        if (action === 'APPROVE_STEP') {
            const { frankHumanGatePolicyEngine } = await import('@/modules/frank/frank-human-gate-policy');
            const policyResult = frankHumanGatePolicyEngine.evaluate({
                userId: auth.session.sub,
                tenantId,
                actionType: payload.actionType || 'APPROVE_STEP',
                riskClass: payload.riskClass || 'GUARDED',
                requiresHumanApproval: true,
                approvalToken: payload.approvalToken,
            });

            if (!policyResult.allowed) {
                return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, policyResult.reason);
            }

            await frankExecutionStateService.approveStep(tenantId, payload.stepId, auth.session.sub || 'human_gate');
            const res = NextResponse.json({ success: true, message: 'Step approved by Human Gate' }, { status: 200 });
            attachRequestIdHeader(res, requestId);
            return res;
        }

        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Unknown action');
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message || 'Failed to execute supervisor action');
    }
}
