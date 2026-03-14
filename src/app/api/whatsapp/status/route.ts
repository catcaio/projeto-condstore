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

        const formData = await request.formData();
        const bodyObj: Record<string, string> = {};
        for (const [key, value] of formData.entries()) {
            bodyObj[key] = value.toString();
        }

        const messageSid = bodyObj.MessageSid;
        const messageStatus = bodyObj.MessageStatus;

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
            await db
                .update(conversationMessages)
                .set({
                    deliveryStatus: messageStatus,
                })
                .where(eq(conversationMessages.id, existing.id));

            logger.info('twilio_status_callback_processed', {
                messageSid,
                messageStatus,
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
