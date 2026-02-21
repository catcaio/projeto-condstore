import { createHash, randomUUID } from 'crypto';
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
    FLOW_ABORTED = 'FLOW_ABORTED'
}

export interface SaveFunnelEventInput {
    tenantId: string;
    phoneNumber: string;
    sessionId: string;
    stage: FunnelStage;
}

export class FunnelRepository {
    /**
     * Save a funnel event to the database.
     * Handles idempotency via unique constraint on (tenantId, messageSid, stage).
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
                    sessionId: input.sessionId,
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
                error: (error as Error).message,
            });
        }
    }
}

export const funnelRepository = new FunnelRepository();
