import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository } from '../../../../../../infra/repositories/tenant-ai-provider.repository';
import { checkRedisRateLimit } from '../../../../../../infra/rate-limit/redis-rate-limiter';

export const runtime = 'nodejs';

function extractTenantId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('tenants');
  if (idx === -1 || !segments[idx + 1]) {
    throw new Error('tenantId is required');
  }
  return segments[idx + 1];
}

function getActorId(request: NextRequest): string {
  return (
    request.headers.get('x-user-id') ||
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

async function enforceRateLimit(request: NextRequest, tenantId: string): Promise<NextResponse | null> {
  const requestId = request.headers.get('x-vercel-id') ?? undefined;
  const actorId = getActorId(request);
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
    const tenantId = extractTenantId(request);
    const rateLimited = await enforceRateLimit(request, tenantId);
    if (rateLimited) return rateLimited;
    const payload = (await request.json()) as { apiKey?: string };

    if (!payload.apiKey) {
      return NextResponse.json({ error: 'apiKey is required' }, { status: 400 });
    }

    await tenantAiProviderRepository.rotateApiKey(tenantId, payload.apiKey);
    return NextResponse.json({ tenantId, rotated: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
