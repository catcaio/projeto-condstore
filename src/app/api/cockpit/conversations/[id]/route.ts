import { NextRequest, NextResponse } from 'next/server';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { decryptString } from '@/infra/pii/crypto';

export const revalidate = 0;

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { id: conversationId } = await context.params;
        const contextData = await conversationService.loadConversationContext(tenantId, conversationId);

        if (!contextData) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Conversation not found');
        }

        const messages = await conversationService.getConversationMessages(tenantId, conversationId);
        const plaintextPhone = decryptString(contextData.conversation.phoneEncrypted);
        const { phoneEncrypted, ...safeConversation } = contextData.conversation;

        return NextResponse.json({
            ok: true,
            data: {
                conversation: {
                    ...safeConversation,
                    phone: plaintextPhone,
                },
                contact: contextData.contact,
                organization: contextData.organization,
                lastQuote: contextData.lastQuote,
                lastOrder: contextData.lastOrder,
                shipment: contextData.shipment,
                messages,
            },
        });
    } catch (err: any) {
        logger.error('Failed to get conversation details', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
