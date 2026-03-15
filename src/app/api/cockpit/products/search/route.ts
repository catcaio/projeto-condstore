import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { catalogService } from '@/modules/catalog/catalog.service';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    
    const { tenantId } = auth.session as any;

    try {
        const url = new URL(request.url);
        const query = url.searchParams.get('q');
        
        if (!query || query.trim().length === 0) {
            return NextResponse.json({ ok: true, data: [] });
        }

        const results = await catalogService.searchProductsByName(tenantId, query);
        
        // Optimizing response for Cockpit usage
        const optimizedResults = results.map(r => ({
            id: r.productId,
            name: r.name,
            sku: r.sku,
            price: r.price,
            basePrice: r.basePrice || r.price,
            weight: r.weight,
            dimensions: r.dimensions,
            active: true // basic mock since catalogService doesn't fetch active solely for the products table
        }));

        return NextResponse.json({ ok: true, data: optimizedResults });
    } catch (err: any) {
        logger.error('Failed to search products', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
