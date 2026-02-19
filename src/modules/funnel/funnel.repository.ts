
import { createHash, randomUUID } from 'crypto';
import { getDb } from '../../infra/db';
import { conversationFunnelEvents } from '../../drizzle/schema';
import { logger } from '../../infra/logger';
import { sql } from 'drizzle-orm';

export enum FunnelStage {
    FLOW_STARTED = 'FLOW_STARTED',
    CEP_PROVIDED = 'CEP_PROVIDED',
    QUANTITY_PROVIDED = 'QUANTITY_PROVIDED',
    FREIGHT_QUOTED = 'FREIGHT_QUOTED',
    // ORDER_CREATED - Reserved for future use
    FLOW_ABORTED = 'FLOW_ABORTED',
}

export interface SaveFunnelEventInput {
    tenantId: string;
    phoneNumber: string;
    stage: FunnelStage;
    messageSid?: string;
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
            const phoneHash = this.hashPhone(input.phoneNumber);

            await db
                .insert(conversationFunnelEvents)
                .values({
                    id: randomUUID(),
                    tenantId: input.tenantId,
                    phoneHash,
                    stage: input.stage,
                    messageSid: input.messageSid,
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

    private hashPhone(phoneNumber: string): string {
        return createHash('sha256').update(phoneNumber).digest('hex');
    }
}

export const funnelRepository = new FunnelRepository();
