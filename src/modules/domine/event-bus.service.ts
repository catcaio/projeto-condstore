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

    async processAsync(tenantId: string, eventId: string) {
        const event = await domineEventsRepository.getById(eventId);
        if (!event || event.status !== 'queued') return;

        try {
            await processDomineEvent(event);
            await domineEventsRepository.markProcessed(eventId);
        } catch (error: any) {
            structuredLogger.error('domine_event_failed', { eventId, type: event.type, err: error.message });
            await domineEventsRepository.sendToDLQ(eventId, 'PROC_ERR', error.message);

            // Check if we exceed N
            const failCount = await domineEventsRepository.getDLQCount(tenantId);
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
}

export const domineEventBus = new DomineEventBus();
