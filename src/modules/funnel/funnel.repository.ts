<<<<<<< HEAD
import { createHash, randomUUID } from 'crypto';
=======
import { randomUUID } from 'crypto';
>>>>>>> 8dc98d7e813b57a0e001017f33ec8cb68a702b24
import { getDb } from '../../infra/db';
import { freightFunnelEvents } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { sql } from 'drizzle-orm';

export enum FunnelStage {
    FLOW_STARTED = 'FLOW_STARTED',
    INTENT_DETECTED = 'INTENT_DETECTED',
    ASKED_CEP = 'ASKED_CEP',
    CEP_PROVIDED = 'CEP_PROVIDED',
    QUANTITY_PROVIDED = 'QUANTITY_PROVIDED',
    FREIGHT_QUOTED = 'FREIGHT_QUOTED',
<<<<<<< HEAD
    FLOW_ABORTED = 'FLOW_ABORTED'
}

export interface SaveFunnelEventInput {
    tenantId: string;
    phoneNumber: string;
    sessionId: string;
    stage: FunnelStage;
=======
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
>>>>>>> 8dc98d7e813b57a0e001017f33ec8cb68a702b24
}

export class FunnelRepository {
    /**
     * Save a funnel event to the database.
<<<<<<< HEAD
     * Handles idempotency via unique constraint on (tenantId, messageSid, stage).
=======
     * Handles idempotency via unique constraint on (sessionId, stage).
>>>>>>> 8dc98d7e813b57a0e001017f33ec8cb68a702b24
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
<<<<<<< HEAD
                    sessionId: input.sessionId,
=======
                    sessionId: input.sessionId,   // Must be explicit — no fallback
>>>>>>> 8dc98d7e813b57a0e001017f33ec8cb68a702b24
                    stage: input.stage,
                })
                .onDuplicateKeyUpdate({
                    set: {
                        // No-op update to satisfy MySQL syntax while doing nothing on conflict
                        id: sql`id`,
                    },
                });

        } catch (error) {
            // Log warning but do not throw to prevent blocking the user flow
            logger.warn('Failed to persist funnel event', {
                tenantId: input.tenantId,
                stage: input.stage,
<<<<<<< HEAD
=======
                messageSid: input.messageSid,
>>>>>>> 8dc98d7e813b57a0e001017f33ec8cb68a702b24
                error: (error as Error).message,
            });
        }
    }
}

export const funnelRepository = new FunnelRepository();
