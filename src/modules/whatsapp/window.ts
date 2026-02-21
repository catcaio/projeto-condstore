/**
 * WhatsApp 24-hour Session Window Utility
 *
 * Twilio only allows freeform messages within 24h of the last inbound message.
 * Beyond that, only approved templates may be sent.
 */

import { db } from '../../lib/db/client';
import { messages } from '../../drizzle/schema';
import { and, eq, desc, gte } from 'drizzle-orm';
import { logger } from '../../infra/logger';

const WINDOW_HOURS = 24;

/**
 * Determine whether we are outside the 24-hour WhatsApp service window
 * for a given phone number within a tenant.
 *
 * Returns `true` (should use template) when no inbound message was received
 * in the past 24 hours.
 */
export async function shouldUseTemplate(tenantId: string, phoneNumber: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - WINDOW_HOURS * 60 * 60 * 1000);

    try {
        const rows = await db
            .select({ createdAt: messages.createdAt })
            .from(messages)
            .where(
                and(
                    eq(messages.tenantId, tenantId),
                    eq(messages.fromPhone, phoneNumber),
                    eq(messages.direction, 'inbound'),
                    gte(messages.createdAt, windowStart),
                )
            )
            .orderBy(desc(messages.createdAt))
            .limit(1);

        const isInsideWindow = rows.length > 0;

        logger.debug('WhatsApp window check', {
            tenantId,
            phone: logger.maskPhone(phoneNumber),
            isInsideWindow,
        });

        return !isInsideWindow; // true = outside window = use template
    } catch (err: any) {
        // Fail open: treat as outside window → use template (safer)
        logger.warn('WhatsApp window check failed; defaulting to template mode', { tenantId }, err);
        return true;
    }
}

/**
 * Parse the configured stale timeout (in minutes) for SLA/session expiry.
 * Default: 60 minutes.
 */
export function getSlaTimeoutMinutes(): number {
    const val = parseInt(process.env.SESSION_SLA_TIMEOUT_MINUTES || '60', 10);
    return isNaN(val) ? 60 : val;
}

/**
 * Parse the configured reengage hold-off window (in minutes).
 * Sessions won't be re-engaged more than once per X minutes.
 * Default: 360 minutes (6 hours).
 */
export function getReengageMinutes(): number {
    const val = parseInt(process.env.REENGAGE_LOOKBACK_MINUTES || '360', 10);
    return isNaN(val) ? 360 : val;
}

/**
 * How long a session must be stuck (in minutes) before we try to reengage.
 * Default: 30 minutes.
 */
export function getStaleSessionMinutes(): number {
    const val = parseInt(process.env.STALE_SESSION_MINUTES || '30', 10);
    return isNaN(val) ? 30 : val;
}
