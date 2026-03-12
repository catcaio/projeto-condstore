import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const { searchParams } = new URL(request.url);
        
        // Build filters
        const filter = {
            limit: Number(searchParams.get('limit')) || 200, // Fetch more for kanban
        };

        const conversations = await conversationService.listConversations(tenantId, filter);

        return NextResponse.json({ ok: true, data: conversations });
    } catch (err: any) {
        logger.error('Failed to list pipeline conversations', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
