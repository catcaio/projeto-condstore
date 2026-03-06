export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getDb } from '@/infra/db';
import { supremePlaybooks, supremeFindings } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { executePlaybook } from '@/lib/supreme/playbook-engine';

export const POST = async (
    request: NextRequest,
    { params }: { params: Promise<{ tenantId: string; playbookId: string }> }
) => {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { tenantId, playbookId } = await params;
    if (!tenantId?.trim() || !playbookId?.trim()) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'tenantId and playbookId required');
    }

    try {
        const db = await getDb();
        const pb = await db.select().from(supremePlaybooks).where(eq(supremePlaybooks.id, playbookId)).limit(1);
        if (!pb[0]) return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Playbook not found');

        // Simulate requires a dummy finding. We create a throwaway finding or fail if none open of that type exist
        // For a real "dry-run", we just want the finding ID to attach the actions to.
        const fnd = await db.select().from(supremeFindings).where(eq(supremeFindings.tenantId, tenantId)).limit(1);

        if (!fnd[0]) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Tenant needs at least one finding to simulate playbook linking.');
        }

        const findingId = fnd[0].id;

        // We execute for real to test the flow (since "proposeAction" is a simulation of the orchestrator)
        const result = await executePlaybook(playbookId, tenantId, findingId);

        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (err: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, err.message ?? 'Failed to simulate playbook');
    }
};
