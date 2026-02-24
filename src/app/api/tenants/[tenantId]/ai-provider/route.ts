import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository, type UpsertTenantAIProviderInput } from '../../../../../infra/repositories/tenant-ai-provider.repository';
import { checkRedisRateLimit } from '../../../../../infra/rate-limit/redis-rate-limiter';
import {
  extractTenantIdFromTenantRoute,
  requireSessionTenantMatch,
} from '../../../../../infra/auth/tenant-route-guard';

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

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  try {
    const tenantId = extractTenantIdFromTenantRoute(request);
    const guard = await requireSessionTenantMatch(request, tenantId);
    if (!guard.ok) return guard.response;

    const rateLimited = await enforceRateLimit(guard.sessionUser.sub, request, guard.tenantId);
    if (rateLimited) return rateLimited;
    const config = await tenantAiProviderRepository.getProviderConfig(guard.tenantId);

    if (!config) {
      return NextResponse.json({ tenantId: guard.tenantId, configured: false }, { status: 404 });
    }

    return NextResponse.json({
      tenantId: guard.tenantId,
      configured: true,
      providerType: config.providerType,
      baseUrl: config.baseUrl,
      model: config.model,
      embedModel: config.embedModel,
      isEnabled: config.isEnabled === 1,
      hasApiKey: Boolean(config.apiKeyEncrypted || config.apiKey),
      timeoutMs: config.timeoutMs,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenantId = extractTenantIdFromTenantRoute(request);
    const guard = await requireSessionTenantMatch(request, tenantId);
    if (!guard.ok) return guard.response;

    const rateLimited = await enforceRateLimit(guard.sessionUser.sub, request, guard.tenantId);
    if (rateLimited) return rateLimited;
    const payload = (await request.json()) as Partial<UpsertTenantAIProviderInput> & {
      isEnabled?: boolean | string;
    };

    const isEnabled = toBoolean(payload.isEnabled);
    const embedModel = payload.embedModel || payload.model;

    if (!payload.providerType || !payload.baseUrl || !payload.model || !embedModel) {
      return NextResponse.json(
        { error: 'providerType, baseUrl, model and embedModel are required' },
        { status: 400 }
      );
    }

    await tenantAiProviderRepository.upsertProviderConfig(guard.tenantId, {
      providerType: payload.providerType,
      baseUrl: payload.baseUrl,
      model: payload.model,
      embedModel,
      timeoutMs: payload.timeoutMs,
      isEnabled,
    });

    return NextResponse.json({ tenantId: guard.tenantId, updated: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
