import { describe, it, expect } from 'vitest';
import { ConcurrentQuoteEngine } from '../ConcurrentQuoteEngine';
import { SimulatedCarrierAdapter } from '../../simulated/SimulatedCarrierAdapter';
import type { QuoteInput } from '../../carriers/types';

describe('ConcurrentQuoteEngine', () => {
    const defaultInput: QuoteInput = {
        originCep: '01000000',
        destinationCep: '02000000',
        weightInKg: 1,
        packageType: 'box',
    };

    it('should fetch quotes from multiple carriers successfully', async () => {
        const adapters = [
            new SimulatedCarrierAdapter({ code: 'c1', name: 'C1', service: 'S1', baseCents: 1000, perKgCents: 100, baseDays: 2, trackable: true }),
            new SimulatedCarrierAdapter({ code: 'c2', name: 'C2', service: 'S2', baseCents: 2000, perKgCents: 100, baseDays: 1, trackable: true }),
        ];

        const result = await ConcurrentQuoteEngine.run({
            tenantId: 'test',
            intentId: 'intent-123',
            input: defaultInput,
            adapters,
            timeoutMs: 1000,
        });

        expect(result.quotes).toHaveLength(2);
        expect(result.summary.respondedCarriers).toHaveLength(2);
        expect(result.summary.failedCarriers).toHaveLength(0);

        // C1 is cheaper
        expect(result.bestPriceId).toBe('c1');
        // C2 is faster
        expect(result.bestSpeedId).toBe('c2');
    });

    it('should handle carrier timeouts', async () => {
        const adapters = [
            new SimulatedCarrierAdapter({ code: 'fast', name: 'Fast', service: 'S', baseCents: 1000, perKgCents: 100, baseDays: 2, trackable: true, simulateLatencyMs: 10 }),
            new SimulatedCarrierAdapter({ code: 'slow', name: 'Slow', service: 'S', baseCents: 1000, perKgCents: 100, baseDays: 2, trackable: true, simulateLatencyMs: 2000 }),
        ];

        const result = await ConcurrentQuoteEngine.run({
            tenantId: 'test',
            intentId: 'intent-123',
            input: defaultInput,
            adapters,
            timeoutMs: 50, // very tight timeout
        });

        expect(result.quotes).toHaveLength(1);
        expect(result.quotes[0].carrierCode).toBe('fast');
        expect(result.summary.failedCarriers).toHaveLength(1);
        expect(result.summary.failedCarriers[0].reason).toBe('TIMEOUT_EXCEEDED');
    });

    it('should handle carrier explicit errors without breaking the other quotes', async () => {
        const adapters = [
            new SimulatedCarrierAdapter({ code: 'ok', name: 'OK', service: 'S', baseCents: 1000, perKgCents: 100, baseDays: 2, trackable: true }),
            new SimulatedCarrierAdapter({ code: 'err', name: 'Err', service: 'S', baseCents: 1000, perKgCents: 100, baseDays: 2, trackable: true, forceError: true }),
        ];

        const result = await ConcurrentQuoteEngine.run({
            tenantId: 'test',
            intentId: 'intent-123',
            input: defaultInput,
            adapters,
        });

        expect(result.quotes).toHaveLength(1);
        expect(result.summary.failedCarriers).toHaveLength(1);
        expect(result.summary.failedCarriers[0].reason).toBe('API_ERROR');
    });
});
