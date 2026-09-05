import { NextRequest, NextResponse } from 'next/server';
import { requireSession } from '@/infra/auth/guards';
import { makeRequestId } from '@/infra/http/request-trace';
import { applyFrankCockpitRateLimit } from '@/infra/security/frank-rate-limit';
import { frankCockpitChatService, StreamEvent } from '@/modules/frank/frank-cockpit-chat.service';
import { logger } from '@/infra/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    const requestId = makeRequestId(req);
    const auth = await requireSession(req, { requestId });

    if (!auth.ok) {
        return auth.response;
    }

    const tenantId = auth.session.tenantId;
    const userId = auth.session.sub;

    const rl = await applyFrankCockpitRateLimit({ tenantId, requestId, route: '/api/cockpit/frank/chat' });
    if (rl.blocked) {
        return rl.response;
    }

    try {
        const body = await req.json();

        // Strict Multi-Tenant Enforcement: Body/query MUST NOT override session tenantId
        if (body.tenantId && typeof body.tenantId === 'string' && body.tenantId.trim() !== tenantId) {
            logger.warn('frank_chat_cross_tenant_blocked', {
                authenticatedTenantId: tenantId,
                requestedTenantId: body.tenantId,
                userId,
                requestId,
            });
            return NextResponse.json(
                { error: 'Cross-tenant manipulation forbidden.' },
                { status: 403 }
            );
        }

        const message = typeof body.message === 'string' ? body.message.trim() : '';
        if (!message && !body.humanApproval) {
            return NextResponse.json(
                { error: 'Message or humanApproval is required.' },
                { status: 400 }
            );
        }

        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const emit = (event: StreamEvent) => {
                    const chunk = `data: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                };

                try {
                    await frankCockpitChatService.processChatMessage(
                        {
                            tenantId,
                            userId,
                            message,
                            context: body.context,
                            executionId: body.executionId,
                            humanApproval: body.humanApproval,
                        },
                        emit
                    );
                } catch (error: any) {
                    logger.error('Error during Frank Cockpit Chat streaming', error as Error, {
                        tenantId,
                        userId,
                        requestId,
                    });
                    emit({
                        type: 'error',
                        error: error instanceof Error ? error.message : 'Internal streaming error',
                    });
                } finally {
                    controller.close();
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
                'X-Request-Id': requestId,
            },
        });
    } catch (error: any) {
        logger.error('Failed to parse request or process Frank Cockpit Chat', error as Error, {
            tenantId,
            userId,
            requestId,
        });
        return NextResponse.json(
            { error: 'Invalid JSON payload or internal error' },
            { status: 400 }
        );
    }
}
