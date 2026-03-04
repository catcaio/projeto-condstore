import { EventHandler, EventHandlerResult } from '../dispatcher';
import { domineReadRepository } from '@/infra/repositories/domine-read.repository';

export const freightQuoteRequestedHandler: EventHandler = {
    eventType: 'FREIGHT_QUOTE_REQUESTED',

    async handle(event): Promise<EventHandlerResult> {
        const payload = event.payloadJson as any;

        const correlationId = payload?.correlationId;
        if (!correlationId) {
            return { ok: false, error: 'Missing correlationId in payload' };
        }

        await domineReadRepository.upsertFreightQuoteReadModel({
            tenantId: event.tenantId,
            correlationId,
            requestId: payload.requestId,
            source: payload.source || event.source,
            originZip: payload.originZip,
            destZip: payload.destZip,
            weight: payload.weight,
            dims: payload.dims,
        });

        return { ok: true };
    }
};
