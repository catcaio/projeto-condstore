import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { adminAuditLogRepository } from '@/infra/repositories/admin-audit-log.repository';
import { tenantIncidentsRepository } from '@/infra/repositories/tenant-incidents.repository';
import { structuredLogger } from '@/infra/log/logger';
import { makeRequestId } from '@/infra/http/request-trace';

// Mock simple processing inline for this pilot phase ("roda em request ... simples")
import { processDomineEvent } from './event-processor';

export class DomineEventBus {
    async publish(
        tenantId: string,
        source: 'cockpit' | 'webhook' | 'connector' | 'frank',
        type: string,
        payload: any,
        options: { idempotencyKey: string; triggeredByUserId?: string }
    ) {
        // Redaction minimal (we assume the caller already minimized the payload, but we could do more here)

        const { id, inserted } = await domineEventsRepository.publish({
            tenantId,
            source,
            type,
            idempotencyKey: options.idempotencyKey,
            payloadJson: payload,
        });

        if (inserted && source === 'cockpit') {
            await adminAuditLogRepository.log({
                tenantId,
                userId: options.triggeredByUserId || 'system',
                action: 'DOMINE_EVENT_PUBLISHED',
                metadata: { eventId: id, type }
            });
        }

        if (inserted) {
            // "Processor roda em request (por enquanto)"
            // Disparar sem await forte (fire and forget)
            // ou await se quisermos síncrono para o piloto
            this.processAsync(tenantId, id).catch();
        }

        return { id, inserted };
    }

    async processAsync(tenantId: string, _eventId?: string) {
        // We ignore the _eventId now and just kick off a processing loop for the tenant
        // The loop will pick up any queued items atomically until empty.
        let hasMore = true;

        while (hasMore) {
            const locked = await domineEventsRepository.lockAndGetNextEvent(tenantId);

            if (!locked) {
                hasMore = false;
                break;
            }

            const eventId = locked.id;
            const event = await domineEventsRepository.getById(eventId);

            try {
                await processDomineEvent(event);
                await domineEventsRepository.markProcessed(eventId);
            } catch (error: any) {
                structuredLogger.error('domine_event_failed', { eventId, type: event.type, err: error.message });
                // Check if we exceed N
                const failCount = await domineEventsRepository.getDLQCount(tenantId);

                // Backoff logic: +5 minutes for every failure up to 60m
                const backoffMs = Math.min(failCount * 5 * 60 * 1000, 60 * 60 * 1000) || (5 * 60 * 1000);
                const nextRetryAt = new Date(Date.now() + backoffMs);

                // NOTE: Here we push it to DLQ ('failed' status). A real retry worker 
                // would need to poll 'failed' events where nextRetryAt <= now() and switch them back to 'queued'.
                // For now, it stays in DLQ but has the timestamp recorded.
                await domineEventsRepository.sendToDLQ(eventId, 'PROC_ERR', error.message, nextRetryAt);

                if (failCount >= 5) { // Arbitrary "N vezes"
                    await tenantIncidentsRepository.logIncident({
                        tenantId,
                        type: 'domine_event_failed',
                        startedAt: new Date(),
                        triggeredBy: 'system',
                        metadata: { message: 'Too many events in DLQ', failCount }
                    });
                }
            }
        }

        // FASE 4 - Backlog Protection
        // After finishing the processing loop for this tenant, if there really is a stuck backlog, warn.
        try {
            const stats = await domineEventsRepository.getDomineOperationalStats(tenantId);
            const fifteenMinutesMs = 15 * 60 * 1000;
            if (stats.oldestUnprocessedEventAge > fifteenMinutesMs) {
                await tenantIncidentsRepository.logIncident({
                    tenantId,
                    type: 'domine_backlog_critical',
                    startedAt: new Date(),
                    triggeredBy: 'system',
                    metadata: { message: 'Events sitting in queue for longer than 15 minutes', age: stats.oldestUnprocessedEventAge }
                });
            }
        } catch (ignoredLoggingError) { }
    }
}

export const domineEventBus = new DomineEventBus();
