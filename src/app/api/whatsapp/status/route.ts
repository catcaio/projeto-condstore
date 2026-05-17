import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';
import { rateLimiter, hashRateLimitKeyForLog } from '@/infra/security/rate-limiter';
import { verifyTwilioSignature } from '@/lib/security/webhook-verifier';
import { whatsappDeliveryStatusService } from '@/modules/atendimento/whatsapp-delivery-status.service';

function xmlAck(status: number = 200) {
    return new NextResponse('<Response></Response>', {
        status,
        headers: { 'Content-Type': 'text/xml' },
    });
}

function parseFormPayload(rawBody: string): Record<string, string> {
    const params = new URLSearchParams(rawBody);
    const payload: Record<string, string> = {};
    params.forEach((value, key) => {
        payload[key] = value;
    });
    return payload;
}

export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('application/x-www-form-urlencoded')) {
            structuredLogger.warn('whatsapp_status_invalid_content_type', {
                route: '/api/whatsapp/status',
                contentType,
            });
            return xmlAck();
        }

        const rawBody = await request.text();
        const payload = parseFormPayload(rawBody);
        const messageSid = payload.MessageSid?.trim();
        const providerStatus = payload.MessageStatus?.trim();
        const providerErrorCode = payload.ErrorCode?.trim() || null;
        const providerErrorMessage = payload.ErrorMessage?.trim() || payload.ChannelStatusMessage?.trim() || null;
        structuredLogger.info('whatsapp_status_webhook_received', {
            route: '/api/whatsapp/status',
            messageSid: messageSid ?? null,
            providerStatus: providerStatus ?? null,
            hasProviderError: Boolean(providerErrorCode || providerErrorMessage),
        });

        if (process.env.NODE_ENV === 'production' && !verifyTwilioSignature(request, rawBody, payload)) {
            logger.warn('twilio_status_callback_invalid_signature', { route: '/api/whatsapp/status' });
            return xmlAck(401);
        }

        if (!messageSid || !providerStatus) {
            structuredLogger.warn('whatsapp_status_missing_required_fields', {
                route: '/api/whatsapp/status',
                hasMessageSid: Boolean(messageSid),
                hasProviderStatus: Boolean(providerStatus),
            });
            return xmlAck();
        }

        const rlKey = `msg:${messageSid}`;
        const rlDecision = await rateLimiter.limit('whatsapp_status', rlKey, { windowSec: 10, max: 20 });
        if (!rlDecision.allowed) {
            logger.warn('whatsapp_status_rate_limited', {
                route: '/api/whatsapp/status',
                messageSid,
                keyHash: hashRateLimitKeyForLog(rlKey),
            });
            return xmlAck();
        }

        const result = await whatsappDeliveryStatusService.updateDeliveryStatus({
            messageSid,
            providerStatus,
            callbackReceivedAt: new Date(),
            providerErrorCode,
            providerErrorMessage,
        });

        structuredLogger.info('whatsapp_status_webhook_processed', {
            route: '/api/whatsapp/status',
            messageSid,
            providerStatus,
            normalizedStatus: result.normalizedStatus ?? null,
            outcome: result.outcome,
            messageId: result.messageId ?? null,
            conversationId: result.conversationId ?? null,
        });

        return xmlAck();
    } catch (error) {
        logger.error('twilio_status_callback_failed', error as Error);
        return xmlAck();
    }
}
