import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { suggestionService } from '@/modules/frank/suggestions/suggestion.service';
import { ApproveSuggestionDTOSchema } from '@/modules/frank/suggestions/suggestion.types';
import { suggestionRepository } from '@/modules/frank/suggestions/suggestion.repository';
import { conversationService } from '@/modules/atendimento/conversation.service';
import { decryptString } from '@/infra/pii/crypto';
import { twilioProvider } from '@/providers/twilio.provider';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';

interface RouteParams {
    params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const tenantId = auth.session.tenantId;

    try {
        const payload = await request.json().catch(() => ({}));
        payload.operatorId = (auth.session as any).sub || 'system';

        const parsed = ApproveSuggestionDTOSchema.safeParse(payload);
        if (!parsed.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid payload', parsed.error);
        }

        const suggestion = await suggestionRepository.findById(tenantId, id);
        if (!suggestion) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Suggestion not found');
        }

        const approved = await suggestionService.approveSuggestion(tenantId, id, parsed.data);

        if (!approved) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Suggestion not found or already processed');
        }

        const conversation = await conversationService.getConversationById(tenantId, suggestion.conversationId);
        if (conversation) {
            const finalResponse = parsed.data.finalResponse || suggestion.suggestedResponse;
            const toPhone = decryptString(conversation.phoneEncrypted);

            await twilioProvider.sendMessage(tenantId, {
                to: toPhone,
                body: finalResponse,
            });

            await conversationService.processOutboundMessage(
                tenantId,
                conversation.id,
                finalResponse,
                'OPERATOR',
                conversation.customerId || undefined,
                { source: 'SUGGESTION_APPROVAL', suggestionId: suggestion.id, actorType: 'HUMAN', messageType: 'TEXT' },
            );

            await publishOperationalEvent({
                tenantId,
                eventType: 'message_sent',
                eventDomain: 'OPERATIONS',
                customerId: conversation.customerId,
                entityId: conversation.id,
                sessionId: suggestion.sessionId,
                payload: { suggestionId: suggestion.id },
            });
        }

        const res = NextResponse.json({ ok: true }, { status: 200 });
        attachRequestIdHeader(res, requestId);
        return res;
    } catch {
        return errorResponse(ErrorCode.DB_ERROR, 500, requestId, 'Failed to approve suggestion');
    }
}
