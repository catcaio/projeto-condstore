import { EventHandler, EventHandlerResult } from '../dispatcher';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';

export const freightQuoteCompletedHandler: EventHandler = {
    eventType: 'FREIGHT_QUOTE_COMPLETED',

    async handle(event): Promise<EventHandlerResult> {
        const payload = event.payloadJson as any;

        const correlationId = payload?.correlationId;
        if (!correlationId) {
            return { ok: false, error: 'Missing correlationId in payload' };
        }

        await domineReadRepository.upsertFreightQuoteReadModel({
            tenantId: event.tenantId,
            correlationId,
            bestCarrier: payload.bestCarrier,
            bestPriceCents: payload.bestPriceCents,
            bestEtaDays: payload.bestEtaDays,
            quotesJsonRedacted: payload.quotesJsonRedacted,
        });

        return { ok: true };
    }
};
