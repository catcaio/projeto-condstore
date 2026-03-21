import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export const revalidate = 0; // Dynamic API

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { searchParams } = new URL(request.url);
        
        // Optional filters
        const status = searchParams.getAll('status'); // Multiple ?status=OPEN&status=WAITING_CUSTOMER
        const assignedTo = searchParams.get('assignedTo');
        const channel = searchParams.get('channel');
        const phoneSearch = searchParams.get('phoneHash');
        const limitStr = searchParams.get('limit');
        const offsetStr = searchParams.get('offset');

        const parsedLimit = limitStr ? parseInt(limitStr, 10) : 50;
        const limit = Math.min(parsedLimit, 500);
        const offset = offsetStr ? parseInt(offsetStr, 10) : 0;

        const filters: any = { limit, offset };
        
        if (status.length > 0) filters.status = status;
        if (assignedTo) filters.assignedTo = assignedTo;
        if (channel) filters.channel = channel;
        // Search by phone hash directly (frontend must hash before searching, or provide partial that's matched elsewhere)
        if (phoneSearch) filters.phoneSearch = phoneSearch;

        const conversations = await conversationService.listConversations(tenantId, filters);

        // Remove encrypted phone from external API response
        const safeConversations = conversations.map(c => {
            const { phoneEncrypted, ...safeProps } = c;
            return safeProps;
        });

        return NextResponse.json({ ok: true, data: safeConversations });
    } catch (err: any) {
        logger.error('Failed to list conversations', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
