/**
 * Twilio WhatsApp Outbound Client
 *
 * Supports two outbound modes:
 *  - freeform: for messages within the 24-hour session window
 *  - template: for messages outside the 24-hour window or explicit reengage
 *
 * NOTE: Tokens are never logged. The masked SID is safe to log.
 */

import { Twilio } from 'twilio';
import { logger } from './logger';

const getTwilioClient = (): Twilio => {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;

    if (!sid || !token) {
        throw new Error('Missing Twilio credentials (TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN)');
    }

    return new Twilio(sid, token);
};

export interface SendFreeformParams {
    to: string;   // e.g. "whatsapp:+5511999999999"
    from: string; // e.g. "whatsapp:+14155238886"
    body: string;
}

export interface SendTemplateParams {
    to: string;
    from: string;
    templateName: string; // Approved Twilio Content SID or WhatsApp template name
    variables?: Record<string, string>; // e.g. { "1": "João", "2": "CEP" }
}

/**
 * Send a freeform WhatsApp message using Twilio Messaging API.
 * Only valid within the 24-hour customer service window.
 */
export async function sendWhatsAppFreeform(params: SendFreeformParams): Promise<string> {
    const { to, from, body } = params;
    const client = getTwilioClient();

    const message = await client.messages.create({ to, from, body });

    logger.info('WhatsApp freeform sent', {
        sid: message.sid,
        to: logger.maskPhone(to),
        status: message.status,
    });

    return message.sid;
}

/**
 * Send a WhatsApp template message (Content API) via Twilio.
 * Used outside 24-hour window for re-engagement, notifications, etc.
 *
 * `templateName` must be a Twilio Content SID (HX...) or pre-approved template SID.
 * `variables` maps positional placeholders e.g. { "1": "João" }.
 */
export async function sendWhatsAppTemplate(params: SendTemplateParams): Promise<string> {
    const { to, from, templateName, variables } = params;
    const client = getTwilioClient();

    // Twilio Content API: contentSid = the template's Content SID
    // For basic templates, we pass contentSid and contentVariables
    const createParams: Record<string, unknown> = {
        to,
        from,
        contentSid: templateName,
    };

    if (variables && Object.keys(variables).length > 0) {
        createParams.contentVariables = JSON.stringify(variables);
    }

    const message = await client.messages.create(createParams as any);

    logger.info('WhatsApp template sent', {
        sid: message.sid,
        to: logger.maskPhone(to),
        template: templateName,
        status: message.status,
    });

    return message.sid;
}

/**
 * Smart outbound sender: uses template if outside 24h window, freeform otherwise.
 */
export async function sendWhatsAppSmart(params: {
    to: string;
    from: string;
    body: string;
    useTemplate: boolean;
    templateName?: string;
    variables?: Record<string, string>;
}): Promise<string> {
    const { to, from, body, useTemplate, templateName, variables } = params;

    if (useTemplate) {
        if (!templateName) {
            throw new Error('templateName is required when useTemplate=true');
        }
        return sendWhatsAppTemplate({ to, from, templateName, variables });
    }

    return sendWhatsAppFreeform({ to, from, body });
}
