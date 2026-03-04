import { domineReadRepository } from '@/infra/repositories/domine-read.repository';

export async function processDomineEvent(event: {
    id: string;
    tenantId: string;
    source: string;
    type: string;
    idempotencyKey: string;
    payloadJson: any;
}) {
    // Basic dispatch based on type
    if (event.type.startsWith('order_')) {
        const orderId = event.payloadJson?.orderId;
        const status = event.payloadJson?.status || event.type;
        const totals = event.payloadJson?.totals || {};

        if (!orderId) throw new Error('orderId missing from payload constraints');

        await domineReadRepository.upsertOrder(event.tenantId, orderId, status, totals);
    }
    else if (event.type === 'freight_quoted') {
        const correlationId = event.payloadJson?.correlationId || event.payloadJson?.quoteId;
        if (!correlationId) throw new Error('correlationId missing for freight_quoted');

        console.log(`[DOMINE] Quoted info processing:`, event.payloadJson);
        const { orderId, ...summary } = event.payloadJson;
        await domineReadRepository.upsertFreightQuoteReadModel({
            tenantId: event.tenantId,
            correlationId,
            quotesJsonRedacted: summary,
        });
    }
    else {
        console.warn(`[DOMINE] No processor mapped for event type: ${event.type}`);
    }
}
