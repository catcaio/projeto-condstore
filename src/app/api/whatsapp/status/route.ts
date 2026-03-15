import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { conversationMessages } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';

// Handles Twilio Status Callbacks (sent, delivered, read, failed)
export async function POST(request: NextRequest) {
    try {
        const contentType = request.headers.get('content-type') || '';
        if (!contentType.includes('application/x-www-form-urlencoded')) {
            return new NextResponse('<Response></Response>', {
                status: 200,
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const rawBody = await request.text();
        const params = new URLSearchParams(rawBody);
        const payload: Record<string, string> = {};
        params.forEach((value, key) => { payload[key] = value; });

        // Validate Twilio Signature
        const twilioUrl = process.env.APP_URL ? `${process.env.APP_URL}/api/whatsapp/status` : `https://${request.headers.get('host')}/api/whatsapp/status`;
        const { verifyTwilioSignature } = await import('@/lib/security/webhook-verifier');
        
        if (process.env.NODE_ENV === 'production' && !verifyTwilioSignature(request, rawBody, payload, twilioUrl)) {
            logger.warn('twilio_status_callback_invalid_signature', { route: '/api/whatsapp/status' });
            return new NextResponse('<Response></Response>', {
                status: 401,
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const messageSid = payload.MessageSid;
        const messageStatus = payload.MessageStatus;

        if (!messageSid || !messageStatus) {
            return new NextResponse('<Response></Response>', {
                status: 200, // Twilio requires 200 OK regardless
                headers: { 'Content-Type': 'text/xml' },
            });
        }

        const db = await getDb();

        const [existing] = await db
            .select()
            .from(conversationMessages)
            .where(eq(conversationMessages.providerMessageId, messageSid))
            .limit(1);

        // If we found the message tracked explicitly by providerMessageId:
        if (existing) {
            let mappedStatus: 'queued' | 'sent' | 'delivered' | 'read' | 'failed' = 'sent';
            switch (messageStatus) {
                case 'queued':
                case 'accepted':
                    mappedStatus = 'queued';
                    break;
                case 'sent':
                    mappedStatus = 'sent';
                    break;
                case 'delivered':
                    mappedStatus = 'delivered';
                    break;
                case 'read':
                    mappedStatus = 'read';
                    break;
                case 'failed':
                case 'undelivered':
                    mappedStatus = 'failed';
                    break;
                default:
                    mappedStatus = 'sent'; // Fallback
            }

            await db.transaction(async (tx) => {
                await tx
                    .update(conversationMessages)
                    .set({
                        deliveryStatus: mappedStatus,
                    })
                    .where(eq(conversationMessages.id, existing.id));

                if (mappedStatus === 'failed') {
                    const { conversations } = await import('@/drizzle/schema');
                    await tx
                        .update(conversations)
                        .set({ status: 'failed_delivery' })
                        .where(eq(conversations.id, existing.conversationId));
                }
            });

            logger.info('twilio_status_callback_processed', {
                messageSid,
                messageStatus,
                mappedStatus,
                messageId: existing.id,
            });
        }

        return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
        });
    } catch (error) {
        logger.error('twilio_status_callback_failed', error as Error);
        return new NextResponse('<Response></Response>', {
            status: 200,
            headers: { 'Content-Type': 'text/xml' },
        });
    }
}
