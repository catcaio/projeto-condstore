import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository } from '../../../../../../infra/repositories/tenant-ai-provider.repository';
import { checkRedisRateLimit } from '../../../../../../infra/rate-limit/redis-rate-limiter';
import {
  extractTenantIdFromTenantRoute,
  requireSessionTenantMatch,
} from '../../../../../../infra/auth/tenant-route-guard';

export const runtime = 'nodejs';

async function enforceRateLimit(actorId: string, request: NextRequest, tenantId: string): Promise<NextResponse | null> {
  const requestId = request.headers.get('x-vercel-id') ?? undefined;
  const result = await checkRedisRateLimit({
    tenantId,
    scope: `admin.ai-provider:${actorId}`,
    requestId,
  });

  if (!result.allowed) {
    return NextResponse.json({ error: 'rate_limited', resetAt: result.resetAt }, { status: 429 });
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = extractTenantIdFromTenantRoute(request);
    const guard = await requireSessionTenantMatch(request, tenantId);
    if (!guard.ok) return guard.response;

    const rateLimited = await enforceRateLimit(guard.sessionUser.sub, request, guard.tenantId);
    if (rateLimited) return rateLimited;
    const payload = (await request.json()) as { apiKey?: string };

    if (!payload.apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
    }

    await tenantAiProviderRepository.rotateApiKey(guard.tenantId, payload.apiKey);
    return NextResponse.json({ tenantId: guard.tenantId, rotated: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
