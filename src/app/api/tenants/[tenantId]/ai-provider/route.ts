import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository, type UpsertTenantAIProviderInput } from '../../../../../infra/repositories/tenant-ai-provider.repository';

export const runtime = 'nodejs';

function extractTenantId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('tenants');
  if (idx === -1 || !segments[idx + 1]) {
    throw new Error('tenantId is required');
  }
  return segments[idx + 1];
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
    const tenantId = extractTenantId(request);
    const config = await tenantAiProviderRepository.getProviderConfig(tenantId);

    if (!config) {
      return NextResponse.json({ tenantId, configured: false }, { status: 404 });
    }

    return NextResponse.json({
      tenantId,
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
    const tenantId = extractTenantId(request);
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

    await tenantAiProviderRepository.upsertProviderConfig(tenantId, {
      providerType: payload.providerType,
      baseUrl: payload.baseUrl,
      model: payload.model,
      embedModel,
      timeoutMs: payload.timeoutMs,
      isEnabled,
    });

    return NextResponse.json({ tenantId, updated: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
