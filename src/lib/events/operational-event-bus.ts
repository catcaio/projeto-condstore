/**
 * operational-event-bus.ts
 * Fire-and-forget publisher for standardized tenant-level business events.
 *
 * Rules:
 *  - Always validates required fields before insert
 *  - Rejects unknown domains
 *  - Never stores plaintext PII (caller's responsibility — enforce by convention)
 *  - Returns void; errors are logged and swallowed to never block callers
 */

import { sql } from 'drizzle-orm';
import { structuredLogger } from '@/infra/log/logger';
import { isValidEventDomain, type EventDomain } from './event-domains';
import { operationalEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PublishOperationalEventInput {
    tenantId: string;
    eventType: string;
    eventDomain: EventDomain;
    entityId?: string | null;
    customerId?: string | null;
    sessionId?: string | null;
    attributionId?: string | null;
    payload?: Record<string, unknown>;
}

export class OperationalEventValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'OperationalEventValidationError';
    }
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateInput(input: PublishOperationalEventInput): void {
    if (!input.tenantId?.trim()) {
        throw new OperationalEventValidationError('tenantId is required');
    }
    if (!input.eventType?.trim()) {
        throw new OperationalEventValidationError('eventType is required');
    }
    if (!input.eventDomain?.trim()) {
        throw new OperationalEventValidationError('eventDomain is required');
    }
    if (!isValidEventDomain(input.eventDomain)) {
        throw new OperationalEventValidationError(
            `Unknown event domain: "${input.eventDomain}". Valid: ACQUISITION | CONVERSION | OPERATIONS | REVENUE | RETENTION`
        );
    }
}

// ── Publisher ─────────────────────────────────────────────────────────────────

/**
 * Publishes a standardized operational event and returns immediately.
 *
 * Any error is caught and logged but never re-thrown so callers are never
 * blocked. Validation errors (unknown domain / missing required field) are
 * only logged — they never throw in production.
 */
export async function publishOperationalEvent(
    input: PublishOperationalEventInput,
): Promise<void> {
    try {
        validateInput(input);

        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(operationalEvents).values({
            id,
            tenantId: input.tenantId,
            eventType: input.eventType,
            eventDomain: input.eventDomain,
            entityId: input.entityId ?? null,
            customerId: input.customerId ?? null,
            sessionId: input.sessionId ?? null,
            attributionId: input.attributionId ?? null,
            payload: input.payload ?? {},
            createdAt: new Date(),
        });

        structuredLogger.info('operational_event_published', {
            eventType: 'operational_event_published',
            tenantId: input.tenantId,
            domain: input.eventDomain,
            type: input.eventType,
            id,
        });
    } catch (err) {
        if (err instanceof OperationalEventValidationError) {
            structuredLogger.warn('operational_event_validation_error', {
                eventType: 'operational_event_validation_error',
                error: err.message,
                input: { tenantId: input.tenantId, eventType: input.eventType, eventDomain: input.eventDomain },
            });
        } else {
            structuredLogger.error('operational_event_publish_failed', {
                eventType: 'operational_event_publish_failed',
                error: err,
                tenantId: input.tenantId,
                type: input.eventType,
            });
        }
        // Never re-throw — integration is always fire-and-forget
    }
}
