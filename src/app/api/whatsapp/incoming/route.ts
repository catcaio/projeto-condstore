export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { structuredLogger } from '@/infra/log/logger';
import { logger } from '@/infra/logger';
import { verifyTwilioSignature } from '@/lib/security/webhook-verifier';
import { twilioProvider } from '@/providers/twilio.provider';
import { tenantRepository } from '@/infra/repositories/tenant.repository';
import { whatsappInboundOrchestrator } from '@/modules/atendimento/whatsapp-inbound-orchestrator.service';
import { normalizePhone, toWhatsAppPhone } from '@/lib/phone/normalize-phone';
import { phoneHash } from '@/lib/phone';

function twimlOk(message: string, requestId?: string): NextResponse {
    const twiml = twilioProvider.generateTwiMLResponse(message);
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse(twiml, { status: 200, headers });
}

function twimlEmpty(requestId?: string): NextResponse {
    const headers: Record<string, string> = { 'Content-Type': 'text/xml' };
    if (requestId) headers['X-Request-Id'] = requestId;
    return new NextResponse('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        status: 200,
        headers,
    });
}

export async function POST(request: Request) {
    const startTime = Date.now();
    const requestId = makeRequestId(request);
    const route = '/api/whatsapp/incoming';

    structuredLogger.info('whatsapp_incoming_start', { requestId, route, eventType: 'route_start' });

    const finish = (response: Response) => {
        attachRequestIdHeader(response, requestId);
        structuredLogger.info('whatsapp_incoming_end', {
            requestId, route, eventType: 'route_end',
            durationMs: Date.now() - startTime, status: response.status,
        });
        return response;
    };

    let currentStep = 'received';
    let payloadFrom = '';
    let messageSidStr = '';

    try {
        const rawBody = await request.text();
        currentStep = 'Content Typed Checked';

        const contentType = request.headers.get('content-type') ?? '';
        if (contentType.includes('application/json')) {
            structuredLogger.warn('whatsapp_incoming_invalid_content_type', { requestId, contentType });
            return finish(twimlEmpty(requestId));
        }

        // --- 1. Security: Twilio Signature Validation ---
        const twilioUrl = process.env.APP_URL ? `${process.env.APP_URL}/api/whatsapp/incoming` : `https://${request.headers.get('host')}/api/whatsapp/incoming`;
        
        const params = new URLSearchParams(rawBody);
        const payload: Record<string, string> = {};
        params.forEach((value, key) => { payload[key] = value; });

        if (process.env.NODE_ENV === 'production' && !verifyTwilioSignature(request, rawBody, payload, twilioUrl)) {
             structuredLogger.warn('whatsapp_incoming_invalid_signature', { requestId, route });
             return finish(twimlEmpty(requestId));
        }

        payloadFrom = payload.From || '';
        messageSidStr = payload.MessageSid || '';
        currentStep = 'Payload Parsed & Signature Validated';

        if (!messageSidStr) {
            logger.warn('whatsapp_incoming_missing_messagesid', { requestId });
            return finish(twimlEmpty(requestId));
        }

        const twilioNumberRaw = payload.To;
        if (!twilioNumberRaw) {
            return finish(twimlOk('Erro interno: payload incompleto.', requestId));
        }

        let tenant;
        try {
            tenant = await tenantRepository.resolveTenantByTwilioNumber(twilioNumberRaw);
        } catch (err) {
            structuredLogger.error('whatsapp_incoming_tenant_error', {
                errorType: err instanceof Error ? err.name : 'UnknownError',
                errorMessage: err instanceof Error ? err.message : String(err),
                route, requestId,
            });
            return finish(twimlEmpty(requestId));
        }

        const incomingMessage = twilioProvider.parseIncomingMessage(payload as any);
        const fromE164 = normalizePhone(incomingMessage.from);
        const fromChannelAddress = toWhatsAppPhone(incomingMessage.from);

        if (!fromE164 || !fromChannelAddress) {
            return finish(twimlOk('Número inválido.', requestId));
        }

        currentStep = 'Calling Orchestrator';

        // --- 2. Call Orchestrator ---
        const policy = await whatsappInboundOrchestrator.process({
            tenantId: tenant.id.toString(),
            messageSid: messageSidStr,
            accountSid: payload.AccountSid || '',
            fromE164,
            fromHash: phoneHash(fromChannelAddress),
            toPhone: payload.To || '',
            rawBodyText: incomingMessage.body || '',
            requestId
        });

        currentStep = 'Applying Reply Policy';

        // --- 3. Resolve Policy (TwiML Reply Protocol) ---
        if (policy.type === 'ACK_ONLY' || policy.type === 'SUPERVISED_NO_REPLY') {
            return finish(twimlEmpty(requestId));
        } else if (policy.type === 'AUTO_REPLY_ALLOWED') {
            return finish(twimlOk(policy.text, requestId));
        }

        return finish(twimlEmpty(requestId));

    } catch (err) {
        structuredLogger.error('whatsapp_incoming_error', {
            errorType: err instanceof Error ? err.name : 'UnknownError',
            errorMessage: err instanceof Error ? err.message : String(err),
            route, requestId, step: currentStep, messageSid: messageSidStr
        });
        
        return finish(twimlEmpty(requestId));
    }
}
