import { describe, expect, it } from 'vitest';
import { resolveIntent, resolveContextualIntent, type SessionAnchors } from './intent-resolver';

describe('resolveIntent', () => {
    it('classifies order status support queries', () => {
        expect(resolveIntent('qual o status do meu pedido?').intent).toBe('ORDER_STATUS');
    });

    it('classifies shipment status support queries', () => {
        expect(resolveIntent('tem rastreio?').intent).toBe('SHIPMENT_STATUS');
    });

    it('classifies recent orders support queries', () => {
        expect(resolveIntent('qual meu último pedido?').intent).toBe('RECENT_ORDERS');
    });

    it('classifies recent quotes support queries', () => {
        expect(resolveIntent('qual foi minha última cotação?').intent).toBe('RECENT_QUOTES');
    });

    it('classifies customer context support queries', () => {
        expect(resolveIntent('quero ver meu cadastro').intent).toBe('CUSTOMER_CONTEXT');
    });
});

describe('resolveContextualIntent', () => {
    const baseAnchors: SessionAnchors = {
        lastReferencedOrderId: null,
        lastReferencedShipmentId: null,
        lastReferencedQuoteId: null,
        lastReferencedCustomerId: null,
        previousIntent: null,
        lastToolUsed: null,
    };

    it('returns standard result for high-confidence keyword match regardless of anchors', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-123',
            previousIntent: 'ORDER_STATUS',
        };

        // "tem rastreio?" matches SHIPMENT_STATUS keywords with high confidence
        const result = resolveContextualIntent('tem rastreio?', anchors);
        expect(result.intent).toBe('SHIPMENT_STATUS');
        expect(result.confidence).toBeGreaterThanOrEqual(0.25);
    });

    it('resolves follow-up "tem rastreio?" as SHIPMENT_STATUS after ORDER_STATUS with order anchor', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-123',
            previousIntent: 'ORDER_STATUS',
        };

        // "e agora?" is a follow-up phrase that won't match any keyword
        const result = resolveContextualIntent('e agora?', anchors);
        expect(result.intent).toBe('SHIPMENT_STATUS');
        expect(result.confidence).toBe(0.70);
    });

    it('resolves follow-up "já saiu?" as SHIPMENT_STATUS after ORDER_STATUS', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-456',
            previousIntent: 'ORDER_STATUS',
        };

        const result = resolveContextualIntent('já saiu?', anchors);
        expect(result.intent).toBe('SHIPMENT_STATUS');
        expect(result.confidence).toBe(0.70);
    });

    it('resolves follow-up "e agora?" as SHIPMENT_STATUS after SHIPMENT_STATUS with shipment anchor', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedShipmentId: 'ship-789',
            previousIntent: 'SHIPMENT_STATUS',
        };

        const result = resolveContextualIntent('e agora?', anchors);
        expect(result.intent).toBe('SHIPMENT_STATUS');
        expect(result.confidence).toBe(0.70);
    });

    it('resolves follow-up after RECENT_ORDERS as ORDER_STATUS with order anchor', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-latest',
            previousIntent: 'RECENT_ORDERS',
        };

        const result = resolveContextualIntent('e o status?', anchors);
        expect(result.intent).toBe('ORDER_STATUS');
        expect(result.confidence).toBe(0.70);
    });

    it('resolves follow-up after RECENT_QUOTES with quote anchor', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedQuoteId: 'quote-001',
            previousIntent: 'RECENT_QUOTES',
        };

        const result = resolveContextualIntent('tem previsão?', anchors);
        expect(result.intent).toBe('RECENT_QUOTES');
        expect(result.confidence).toBe(0.70);
    });

    it('resolves follow-up after CUSTOMER_CONTEXT as RECENT_ORDERS with customer anchor', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedCustomerId: 'cust-001',
            previousIntent: 'CUSTOMER_CONTEXT',
        };

        const result = resolveContextualIntent('e agora?', anchors);
        expect(result.intent).toBe('RECENT_ORDERS');
        expect(result.confidence).toBe(0.70);
    });

    it('falls through as OUTRO when no anchors exist and message is ambiguous', () => {
        const result = resolveContextualIntent('e agora?', null);
        expect(result.intent).toBe('OUTRO');
        expect(result.confidence).toBeLessThan(0.25);
    });

    it('falls through as OUTRO when anchors exist but no previous intent', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-123',
            previousIntent: null,
        };

        const result = resolveContextualIntent('e agora?', anchors);
        expect(result.intent).toBe('OUTRO');
    });

    it('falls through as OUTRO for non-follow-up phrases with no keyword match', () => {
        const anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-123',
            previousIntent: 'ORDER_STATUS',
        };

        // "xyzabc" is not a follow-up phrase
        const result = resolveContextualIntent('xyzabc', anchors);
        expect(result.intent).toBe('OUTRO');
    });

    it('handles multi-message sequence: order status → shipment follow-up', () => {
        // Turn 1: explicit order query
        const turn1 = resolveContextualIntent('qual o status do meu pedido?', null);
        expect(turn1.intent).toBe('ORDER_STATUS');

        // Turn 2: follow-up after order status resolved
        const turn2Anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-resolved',
            previousIntent: 'ORDER_STATUS',
            lastToolUsed: 'get_order_status',
        };
        const turn2 = resolveContextualIntent('tem rastreio?', turn2Anchors);
        // "tem rastreio" also matches SHIPMENT_STATUS keywords directly
        expect(turn2.intent).toBe('SHIPMENT_STATUS');

        // Turn 3: follow-up with short phrase after shipment resolved
        const turn3Anchors: SessionAnchors = {
            ...baseAnchors,
            lastReferencedOrderId: 'order-resolved',
            lastReferencedShipmentId: 'ship-resolved',
            previousIntent: 'SHIPMENT_STATUS',
            lastToolUsed: 'get_shipment_status',
        };
        const turn3 = resolveContextualIntent('quando chega?', turn3Anchors);
        expect(turn3.intent).toBe('SHIPMENT_STATUS');
        expect(turn3.confidence).toBe(0.70);
    });
});
