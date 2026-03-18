import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/services/search.service';
import { requireSession } from '@/infra/auth/guards';

export async function GET(request: NextRequest) {
    const sessionResult = await requireSession(request);
    if (!sessionResult.ok) return sessionResult.response;

    const { tenantId } = sessionResult.session;
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q');

    if (!query) {
        return NextResponse.json(
            { error: 'q is required' },
            { status: 400 },
        );
    }

    const results = await searchService.searchEntities({
        tenantId,
        query,
        entityType: (searchParams.get('entityType') as any) ?? undefined,
        limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 20,
        offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!, 10) : 0,
    });

    return NextResponse.json({ results });
}
