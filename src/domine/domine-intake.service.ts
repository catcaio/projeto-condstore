import crypto from 'crypto';
import { PublishInputSchema, type PublishInput } from './contracts/event';
import { isDomineEnabled } from './tenant';
import { domineEventsRepository } from '../infra/repositories/domine-events.repository';
import { structuredLogger } from '../infra/log/logger';

export class DomineIntakeError extends Error {
    code: string;
    constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = 'DomineIntakeError';
    }
}

export interface IntakeResult {
    id: string;
    inserted: boolean;
}

/**
 * Unified Domine Intake Service.
 *
 * Validates input, enforces tenant guard (LOJACOND only for v1),
 * persists event via the events repository, and logs without PII.
 */
export class DomineIntakeService {
    async publish(input: PublishInput): Promise<IntakeResult> {
        // ── 1. Validate via Zod ──────────────────────────────────────────
        const parsed = PublishInputSchema.safeParse(input);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues[0]?.message ?? 'Invalid input';
            throw new DomineIntakeError('VALIDATION_ERROR', firstIssue);
        }

        const { tenantId, type, source, payload, idempotencyKey } = parsed.data;

        // ── 2. LOJACOND guard ────────────────────────────────────────────
        const domineEnabled = await isDomineEnabled(tenantId);
        if (!domineEnabled) {
            structuredLogger.warn('domine_intake_rejected', {
                tenantId,
                reason: 'tenant_not_enabled',
                eventType: 'domine_intake',
            });
            throw new DomineIntakeError('TENANT_NOT_ENABLED', `Domine is not enabled for tenant ${tenantId}`);
        }

        // ── 3. Generate idempotency key if missing ───────────────────────
        const resolvedKey = idempotencyKey ?? crypto.randomUUID();

        // ── 4. Persist via repository ────────────────────────────────────
        const result = await domineEventsRepository.publish({
            tenantId,
            source: source as 'cockpit' | 'webhook' | 'connector' | 'frank',
            type,
            idempotencyKey: resolvedKey,
            payloadJson: payload ?? null,
        });

        // ── 5. Log safely (no payload) ───────────────────────────────────
        structuredLogger.info('domine_intake_published', {
            eventId: result.id,
            tenantId,
            type,
            source,
            inserted: result.inserted,
            idempotencyKey: resolvedKey,
            eventType: 'domine_intake',
        });

        return result;
    }
}

export const domineIntakeService = new DomineIntakeService();
