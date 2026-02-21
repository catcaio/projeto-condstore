import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db/client';
import { freightFunnelEvents } from '../../../../drizzle/schema';
import { and, inArray, lte, gte, eq, not } from 'drizzle-orm';
import { sendWhatsAppTemplate } from '../../../../infra/twilio.client';
import { resolveTemplateId } from '../../../../modules/whatsapp/templates';
import { getStaleSessionMinutes, getReengageMinutes } from '../../../../modules/whatsapp/window';
import { logger } from '../../../../infra/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * Cron Job: Re-engage Abandoned WhatsApp Conversations
 *
 * Protected by CRON_SECRET header: x-cron-secret
 * Schedule in vercel.json:
 *   { "path": "/api/cron/reengage", "schedule": "0 * * * *" }  (every hour)
 *
 * Logic:
 *  - Find sessions stuck in ASKED_CEP or CEP_PROVIDED for > STALE_SESSION_MINUTES
 *  - Exclude phone+tenant combos already RE-ENGAGED in the last REENGAGE_LOOKBACK_MINUTES
 *  - Send WhatsApp template and log a REENGAGED funnel event
 */
export async function GET(req: NextRequest) {
    // Auth guard
    const secret = process.env.CRON_SECRET;
    const providedSecret = req.headers.get('x-cron-secret');

    if (!secret || providedSecret !== secret) {
        logger.warn('Cron reengage: unauthorized attempt', {
            ip: req.headers.get('x-forwarded-for') ?? 'unknown',
        });
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const staleMs = getStaleSessionMinutes() * 60 * 1000;
    const reengageMs = getReengageMinutes() * 60 * 1000;
    const now = Date.now();

    const staleThreshold = new Date(now - staleMs);
    const reengageThreshold = new Date(now - reengageMs);

    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
    if (!fromNumber) {
        logger.warn('Cron reengage: TWILIO_WHATSAPP_NUMBER not set');
        return NextResponse.json({ error: 'Missing TWILIO_WHATSAPP_NUMBER' }, { status: 500 });
    }

    // Normalize sender number
    const fromWa = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`;

    try {
        // Step 1: find sessions stuck in ASKED_CEP or CEP_PROVIDED
        const staleEvents = await db
            .select({
                tenantId: freightFunnelEvents.tenantId,
                phoneNumber: freightFunnelEvents.phoneNumber,
                sessionId: freightFunnelEvents.sessionId,
                stage: freightFunnelEvents.stage,
                createdAt: freightFunnelEvents.createdAt,
            })
            .from(freightFunnelEvents)
            .where(
                and(
                    inArray(freightFunnelEvents.stage, ['ASKED_CEP', 'CEP_PROVIDED']),
                    lte(freightFunnelEvents.createdAt, staleThreshold),
                )
            )
            .limit(100);

        if (staleEvents.length === 0) {
            return NextResponse.json({ reengaged: 0, message: 'No stale sessions' });
        }

        // Step 2: Load recent REENGAGED events to skip already re-engaged phones
        const recentlyReengaged = await db
            .select({
                tenantId: freightFunnelEvents.tenantId,
                phoneNumber: freightFunnelEvents.phoneNumber,
            })
            .from(freightFunnelEvents)
            .where(
                and(
                    eq(freightFunnelEvents.stage, 'REENGAGED'),
                    gte(freightFunnelEvents.createdAt, reengageThreshold),
                )
            );

        const reengagedSet = new Set(
            recentlyReengaged.map(r => `${r.tenantId}:${r.phoneNumber}`)
        );

        // Step 3: filter out already-reengaged
        const eligible = staleEvents.filter(e => {
            return !reengagedSet.has(`${e.tenantId}:${e.phoneNumber}`);
        });

        if (eligible.length === 0) {
            return NextResponse.json({ reengaged: 0, message: 'All stale sessions already reengaged recently' });
        }

        // Step 4: send templates and log REENGAGED events
        let reengagedCount = 0;
        const errors: string[] = [];

        for (const event of eligible) {
            const toWa = event.phoneNumber.startsWith('whatsapp:')
                ? event.phoneNumber
                : `whatsapp:${event.phoneNumber}`;

            // Choose template: CEP_PROVIDED gets PEDIR_DADOS, others get REENGAGE_FRETE
            const templateKey = event.stage === 'CEP_PROVIDED' ? 'PEDIR_DADOS' : 'REENGAGE_FRETE';

            try {
                const templateId = resolveTemplateId(templateKey);

                await sendWhatsAppTemplate({
                    to: toWa,
                    from: fromWa,
                    templateName: templateId,
                });

                // Log REENGAGED funnel event
                await db.insert(freightFunnelEvents).values({
                    id: crypto.randomUUID(),
                    tenantId: event.tenantId,
                    phoneNumber: event.phoneNumber,
                    sessionId: event.sessionId,
                    stage: 'REENGAGED',
                });

                reengagedCount++;

                logger.info('Session reengaged', {
                    tenantId: event.tenantId,
                    phone: logger.maskPhone(event.phoneNumber),
                    stage: event.stage,
                    template: templateKey,
                });
            } catch (err: any) {
                const msg = `Failed to reengage ${logger.maskPhone(event.phoneNumber)}: ${err.message}`;
                logger.warn(msg, { tenantId: event.tenantId });
                errors.push(msg);
            }
        }

        return NextResponse.json({
            reengaged: reengagedCount,
            eligible: eligible.length,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err: any) {
        logger.error('Cron reengage fatal error', err);
        return NextResponse.json({ error: 'Internal error', detail: err.message }, { status: 500 });
    }
}
