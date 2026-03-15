import { describe, it, expect, vi } from 'vitest';
import { GET } from '../route';
import { catalogService } from '@/modules/catalog/catalog.service';

vi.mock('@/infra/auth/guards', () => ({
    requireAdmin: vi.fn().mockResolvedValue({
        ok: true,
        session: { tenantId: 't1' }
    })
}));

vi.mock('@/modules/catalog/catalog.service', () => ({
    catalogService: {
        searchProductsByName: vi.fn()
    }
}));

describe('Product Search Route API', () => {
    it('returns empty when query is empty', async () => {
        const req = new Request('http://localhost:3000/api/cockpit/products/search?q=   ');
        const res = await GET(req as any);
        const body = await res.json();
        
        expect(body.ok).toBe(true);
        expect(body.data).toEqual([]);
        expect(catalogService.searchProductsByName).not.toHaveBeenCalled();
    });

    it('searches and maps results for cockpit usage when query is valid', async () => {
        const req = new Request('http://localhost:3000/api/cockpit/products/search?q=caixa');
        
        vi.mocked(catalogService.searchProductsByName).mockResolvedValue([{
            productId: 'p1',
            id: 'p1',
            name: 'Caixa de Papelão',
            sku: 'CX-101',
            price: 15.00,
            basePrice: 15.00,
            weight: 0.5,
            volume: 10,
            dimensions: { width: 10, height: 10, length: 10 }
        }]);

        const res = await GET(req as any);
        const body = await res.json();
        
        expect(body.ok).toBe(true);
        expect(body.data).toHaveLength(1);
        expect(body.data[0]).toMatchObject({
            id: 'p1',
            name: 'Caixa de Papelão',
            sku: 'CX-101',
            price: 15,
            active: true
        });
        expect(catalogService.searchProductsByName).toHaveBeenCalledWith('t1', 'caixa');
    });
});
