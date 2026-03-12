import { describe, expect, it } from 'vitest';
import {
    buildFrankAssistMetrics,
    type FrankAssistMetricsFilters,
    type FrankAssistOperationalEventRow,
} from './frank-assist-metrics.service';

function makeFilters(overrides?: Partial<FrankAssistMetricsFilters>): FrankAssistMetricsFilters {
    return {
        tenantId: 'tenant-a',
        from: new Date('2026-03-01T00:00:00.000Z'),
        to: new Date('2026-03-31T23:59:59.999Z'),
        period: '30d',
        outcome: 'all',
        ...overrides,
    };
}

function makeResponseRow(overrides?: Partial<FrankAssistOperationalEventRow>): FrankAssistOperationalEventRow {
    return {
        tenantId: 'tenant-a',
        eventType: 'frank_assist_response',
        sessionId: 'session-a',
        entityId: 'order-1',
        payload: {
            intent: 'ORDER_STATUS',
            toolUsed: 'get_order_status',
            outcome: 'success',
            latencyMs: 320,
        },
        createdAt: new Date('2026-03-10T10:00:00.000Z'),
        ...overrides,
    };
}

describe('buildFrankAssistMetrics', () => {
    it('isolates aggregation by tenant and computes handoff rate', () => {
        const rows: FrankAssistOperationalEventRow[] = [
            makeResponseRow(),
            makeResponseRow({
                sessionId: 'session-b',
                entityId: 'shipment-1',
                payload: {
                    intent: 'SHIPMENT_STATUS',
                    toolUsed: 'get_shipment_status',
                    outcome: 'fallback',
                    fallbackReason: 'shipment_incomplete',
                    latencyMs: 480,
                },
                createdAt: new Date('2026-03-11T10:00:00.000Z'),
            }),
            makeResponseRow({
                tenantId: 'tenant-b',
                sessionId: 'foreign-session',
                payload: {
                    intent: 'RECENT_QUOTES',
                    toolUsed: 'get_recent_quotes',
                    outcome: 'success',
                    latencyMs: 100,
                },
            }),
        ];

        const result = buildFrankAssistMetrics(rows, makeFilters());

        expect(result.kpis.totalInteractions).toBe(2);
        expect(result.kpis.totalHandoffs).toBe(1);
        expect(result.kpis.handoffRate).toBe(50);
        expect(result.kpis.uniqueSessions).toBe(2);
    });

    it('groups intents and tools from response events only', () => {
        const rows: FrankAssistOperationalEventRow[] = [
            makeResponseRow(),
            makeResponseRow({
                sessionId: 'session-b',
                payload: {
                    intent: 'ORDER_STATUS',
                    toolUsed: 'get_order_status',
                    outcome: 'success',
                    latencyMs: 200,
                },
                createdAt: new Date('2026-03-10T12:00:00.000Z'),
            }),
            makeResponseRow({
                sessionId: 'session-c',
                entityId: 'shipment-1',
                payload: {
                    intent: 'SHIPMENT_STATUS',
                    toolUsed: 'get_shipment_status',
                    outcome: 'fallback',
                    fallbackReason: 'shipment_not_found',
                    latencyMs: 500,
                },
                createdAt: new Date('2026-03-12T10:00:00.000Z'),
            }),
            {
                tenantId: 'tenant-a',
                eventType: 'frank_assist_handoff',
                sessionId: 'session-c',
                entityId: 'shipment-1',
                payload: {
                    intent: 'SHIPMENT_STATUS',
                    reason: 'shipment_not_found',
                },
                createdAt: new Date('2026-03-12T10:00:01.000Z'),
            },
        ];

        const result = buildFrankAssistMetrics(rows, makeFilters());

        expect(result.intents).toEqual([
            { key: 'ORDER_STATUS', count: 2, share: 66.7 },
            { key: 'SHIPMENT_STATUS', count: 1, share: 33.3 },
        ]);
        expect(result.tools).toEqual([
            {
                toolUsed: 'get_order_status',
                total: 2,
                successCount: 2,
                fallbackCount: 0,
                successRate: 100,
            },
            {
                toolUsed: 'get_shipment_status',
                total: 1,
                successCount: 0,
                fallbackCount: 1,
                successRate: 0,
            },
        ]);
        expect(result.fallbackReasons).toEqual([
            { key: 'shipment_not_found', count: 1, share: 100 },
        ]);
    });

    it('does not expose PII in the response shape', () => {
        const rows: FrankAssistOperationalEventRow[] = [
            makeResponseRow({
                payload: {
                    intent: 'CUSTOMER_CONTEXT',
                    toolUsed: 'get_customer_context',
                    outcome: 'success',
                    latencyMs: 250,
                    phone: '+5511999999999',
                    email: 'cliente@example.com',
                },
            }),
        ];

        const result = buildFrankAssistMetrics(rows, makeFilters());
        const serialized = JSON.stringify(result);

        expect(serialized).not.toContain('+5511999999999');
        expect(serialized).not.toContain('cliente@example.com');
        expect(serialized).not.toContain('"payload"');
    });

    it('returns an empty safe shape when there is no data', () => {
        const result = buildFrankAssistMetrics([], makeFilters());

        expect(result.kpis).toEqual({
            totalInteractions: 0,
            totalHandoffs: 0,
            handoffRate: 0,
            avgResponseTimeMs: 0,
            uniqueSessions: 0,
            knowledgeUsed: 0,
            suggestionsGenerated: 0,
            suggestionsApproved: 0,
            suggestionsEdited: 0,
            suggestionsRejected: 0,
            memoryContextHits: 0,
        });
        expect(result.intents).toEqual([]);
        expect(result.tools).toEqual([]);
        expect(result.fallbackReasons).toEqual([]);
        expect(result.sessions).toEqual([]);
        expect(result.volume.length).toBeGreaterThan(0);
    });
});
