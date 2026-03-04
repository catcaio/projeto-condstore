import { subscribeEvent, publishEvent } from '../domine/event-bus';
import { logger } from '../infra/logger';
import crypto from 'crypto';
import { unifiedQuoteEngine } from '../modules/freight/quote-engine';
import { FreightRequest } from '../modules/freight/freight.types';

export function startQuoteWorker() {
    logger.info('Starting Quote Worker...');

    subscribeEvent('FREIGHT_QUOTE_REQUESTED', async (event) => {
        const { quoteInput, intentIdRaw } = event.payload as any;

        try {
            const req: FreightRequest = {
                destinationCep: quoteInput.destinationCep,
                quantity: 1,
                tenantId: event.tenantId || undefined,
                requestId: intentIdRaw,
                unitWeight: quoteInput.weightInKg,
                dimensions: {
                    width: quoteInput.widthCm || 0,
                    height: quoteInput.heightCm || 0,
                    length: quoteInput.lengthCm || 0
                }
            };

            const options = await unifiedQuoteEngine.getQuotes(req);

            const bestPriceId = options.length > 0 ? options[0].carrier : '';
            const bySpeed = [...options].sort((a, b) => a.deliveryTime - b.deliveryTime);
            const bestSpeedId = bySpeed.length > 0 ? bySpeed[0].carrier : '';

            publishEvent({
                id: crypto.randomUUID(),
                tenantId: event.tenantId,
                type: 'FREIGHT_QUOTE_COMPLETED',
                source: 'quote-worker',
                payload: {
                    intentIdRaw,
                    result: {
                        intentId: intentIdRaw,
                        simulated: false,
                        quotes: options,
                        bestPriceId,
                        bestSpeedId,
                    }
                },
                createdAt: new Date(),
                version: 1,
            });
        } catch (error) {
            logger.error('quote_worker_failed', error as Error, {
                intentIdRaw,
                tenantId: event.tenantId,
            });
            // We should ideally publish a failed event so the API doesn't timeout if it was synchronously waiting,
            // but for now relying on the timeout or a specific error event.
        }
    });
}

if (require.main === module) {
    startQuoteWorker();
}
