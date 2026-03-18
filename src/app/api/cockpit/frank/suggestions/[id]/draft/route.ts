import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { frankService } from '@/modules/frank/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    
    // Auth Guard -> extracts session and tenant context
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id: conversationId } = await params;
    const tenantId = auth.session.tenantId;
    const operatorId = (auth.session as any).sub || 'system';

    try {
        if (!conversationId) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Conversation ID is required');
        }

        // Fire Copilot Generator (Observe - Zero DB Writes)
        const suggestions = await frankService.generateCopilotSuggestions(tenantId, conversationId, operatorId);

        // Wrap payload
        const payload = {
            frankSuggestions: suggestions
        };

        const response = NextResponse.json(payload);
        attachRequestIdHeader(response, requestId);
        return response;

    } catch (error: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to process Copilot request', error);
    }
}
