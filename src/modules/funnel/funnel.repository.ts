import { randomUUID } from 'crypto';
import { getDb } from '../../infra/db';
import { freightFunnelEvents } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { sql } from 'drizzle-orm';
import { redisClient } from '../../infra/redis.client';
import type { AttributionSnapshot } from '../../infra/attribution/attribution.types';

export enum FunnelStage {
    FLOW_STARTED = 'FLOW_STARTED',
    INTENT_DETECTED = 'INTENT_DETECTED',
    ASKED_CEP = 'ASKED_CEP',
    CEP_PROVIDED = 'CEP_PROVIDED',
    QUANTITY_PROVIDED = 'QUANTITY_PROVIDED',
    FREIGHT_QUOTED = 'FREIGHT_QUOTED',
    FLOW_ABORTED = 'FLOW_ABORTED',
    REENGAGED = 'REENGAGED',
}

/**
 * Input contract for saving a funnel event.
 *
 * `sessionId` is MANDATORY — must come from `session.sessionId`.
 * `messageSid` is OPTIONAL — used for message-level tracing only.
 * Never generate or fall back to a random UUID for sessionId here.
 */
export interface SaveFunnelEventInput {
    tenantId: string;
    phoneNumber: string;
    sessionId: string;      // Required: always pass session.sessionId explicitly
    stage: FunnelStage;
    messageSid?: string;    // Optional: Twilio MessageSid for tracing
    attribution?: AttributionSnapshot | null;
}

export class FunnelRepository {
    /**
     * Save a funnel event to the database.
     * Handles idempotency via unique constraint on (sessionId, stage).
     * Swallows errors to avoid blocking the main flow, logging them as warnings.
     */
    async saveEvent(input: SaveFunnelEventInput): Promise<void> {
        try {
            const db = await getDb();

            await db
                .insert(freightFunnelEvents)
                .values({
                    id: randomUUID(),
                    tenantId: input.tenantId,
                    phoneNumber: input.phoneNumber,
                    sessionId: input.sessionId,   // Must be explicit — no fallback
                    stage: input.stage,
                    utmSource: input.attribution?.utmSource ?? null,
                    utmMedium: input.attribution?.utmMedium ?? null,
                    utmCampaign: input.attribution?.utmCampaign ?? null,
                    utmTerm: input.attribution?.utmTerm ?? null,
                    utmContent: input.attribution?.utmContent ?? null,
                    refToken: input.attribution?.refToken ?? null,
                    clickId: input.attribution?.clickId ?? null,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        // No-op update to satisfy MySQL syntax while doing nothing on conflict
                        id: sql`id`,
                    },
                });

            if (redisClient.isAvailable()) {
                await redisClient.del(`cockpit:metrics:funnel:${input.tenantId}`);
            }

        } catch (error) {
            // Log warning but do not throw to prevent blocking the user flow
            logger.warn('Failed to persist funnel event', {
                tenantId: input.tenantId,
                stage: input.stage,
                messageSid: input.messageSid,
                error: (error as Error).message,
            });
        }
    }
}

export const funnelRepository = new FunnelRepository();
