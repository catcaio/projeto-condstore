import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { freightQuoteService } from '@/modules/atendimento/freight-quote.service';
import { orderService } from '@/modules/atendimento/order.service';
import { isOrderBillingRequiredError } from '@/modules/billing/guards/assertTenantCanOperateOrders';
import { runFrankAgentTool } from '@/modules/frank/agent-loop';

function isOrderBillingRequiredMessage(message: string) {
    return message.includes('does not allow order creation or confirmation.');
}

function classifyCreateOrderError(message: string) {
    if (message.includes('A cotação está sendo processada')) {
        return { code: 'LOCK_BUSY' as const, status: 409 };
    }

    if (isOrderBillingRequiredMessage(message)) {
        return { code: ErrorCode.VALIDATION_ERROR, status: 402 };
    }

    if (
        message.includes('Quote not found') ||
        message.includes('Quote does not belong') ||
        message.includes('Cannot convert') ||
        message.includes('Quote already converted') ||
        message.includes('A cotacao precisa estar aprovada')
    ) {
        return { code: ErrorCode.VALIDATION_ERROR, status: 400 };
    }

    return { code: 'INTERNAL_ERROR' as const, status: 500 };
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string; quoteId: string }> }
) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId, sub } = auth.session as any;
    const { id: conversationId, quoteId } = await context.params;

    try {
        const quote = await freightQuoteService.getQuoteById(tenantId, quoteId);

        if (!quote) {
            return errorResponse('NOT_FOUND' as any, 404, requestId, 'Quote not found');
        }

        if (quote.conversationId !== conversationId) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'Quote does not belong to this conversation');
        }

        const toolResult = await runFrankAgentTool({
            requestId,
            action: 'CREATE_ORDER_FROM_ACCEPTED_QUOTE',
            quoteStatus: quote.status ?? null,
            execute: async () => orderService.createOrderFromQuote(
                tenantId,
                conversationId,
                quoteId,
                sub
            ),
        });

        if (!toolResult.ok) {
            const classification = classifyCreateOrderError(toolResult.errorMessage ?? 'Failed to create order from quote');
            return errorResponse(
                classification.code as never,
                classification.status,
                requestId,
                toolResult.errorMessage ?? 'Failed to create order from quote',
            );
        }

        return NextResponse.json({ ok: true, data: toolResult.data });
    } catch (err: any) {
        if (isOrderBillingRequiredError(err)) {
            logger.warn('Order creation blocked by billing gate', {
                requestId,
                tenantId,
                conversationId,
                quoteId,
                planStatus: err.planStatus,
            });
            return errorResponse(ErrorCode.VALIDATION_ERROR, err.statusCode, requestId, err.message);
        }

        logger.error('Failed to create order from quote', err as Error, { requestId });
        const message = err instanceof Error ? err.message : 'Failed to create order from quote';
        const classification = classifyCreateOrderError(message);
        return errorResponse(classification.code as any, classification.status, requestId, message);
    }
}
