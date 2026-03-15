import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { metricsService } from '@/modules/atendimento/metrics.service';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1' }
    })
}));

vi.mock('@/modules/atendimento/metrics.service', () => ({
    metricsService: {
        getMetrics: vi.fn().mockResolvedValue({ totalConversations: 10 })
    }
}));

describe('Metrics Summary Route', () => {
    it('returns validation error if window is invalid', async () => {
        const req = new Request('http://localhost:3000/api/cockpit/metrics/summary?window=100d');
        const res = await GET(req as any);
        const body = await res.json();
        
        expect(res.status).toBe(400);
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('passes standard windows accurately mapping fromDate', async () => {
        const tests = [
            { w: 'today', diffDates: 0 },
            { w: '7d', diffDates: 7 },
            { w: '30d', diffDates: 30 }
        ];

        for (const t of tests) {
            const req = new Request(`http://localhost:3000/api/cockpit/metrics/summary?window=${t.w}`);
            await GET(req as any);

            // get last exact call to target the injected fromDate parameter
            const lastCallParams = vi.mocked(metricsService.getMetrics).mock.calls.at(-1)![0];
            expect(lastCallParams.tenantId).toBe('t1');

            const now = new Date();
            if (t.w === 'today') {
                now.setHours(0,0,0,0);
            } else {
                now.setDate(now.getDate() - t.diffDates);
            }
            
            // Allow ~1.5s clock skew diff since js engine evaluates Date back to back
            expect(lastCallParams.fromDate!.getTime()).toBeCloseTo(now.getTime(), -3); 
        }
    });
    
    it('allows "all" by passing undefined constraints to the query mapping', async () => {
        const req = new Request('http://localhost:3000/api/cockpit/metrics/summary?window=all');
        await GET(req as any);

        const lastCallParams = vi.mocked(metricsService.getMetrics).mock.calls.at(-1)![0];
        expect(lastCallParams.tenantId).toBe('t1');
        expect(lastCallParams.fromDate).toBeUndefined();
    });
});
