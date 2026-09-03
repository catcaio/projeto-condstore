import { NextResponse } from 'next/server';
import { frankExecutionStateService } from '@/modules/frank/frank-execution-state.service';
import { frankObserverService } from '@/modules/frank/frank-observer.service';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'demo_tenant';
    const executionId = searchParams.get('executionId');

    if (executionId) {
        const details = await frankExecutionStateService.getExecutionWithSteps(tenantId, executionId);
        return NextResponse.json({ success: true, details });
    }

    // Return active system signals
    return NextResponse.json({
        success: true,
        status: 'ACTIVE_SUPERVISOR',
        timestamp: new Date().toISOString()
    });
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tenantId = 'demo_tenant', action, payload } = body;

        if (action === 'OBSERVE_SIGNAL') {
            const executionId = await frankObserverService.observeSignal({
                tenantId,
                signalType: payload.signalType,
                domain: payload.domain || 'operations',
                severity: payload.severity || 'MEDIUM',
                summary: payload.summary,
                evidence: payload.evidence || {}
            });
            return NextResponse.json({ success: true, executionId });
        }

        if (action === 'APPROVE_STEP') {
            await frankExecutionStateService.approveStep(payload.stepId, payload.approvedBy || 'human_gate');
            return NextResponse.json({ success: true, message: 'Step approved by Human Gate' });
        }

        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
