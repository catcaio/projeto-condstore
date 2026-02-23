import { NextRequest, NextResponse } from 'next/server';
import { tenantAiProviderRepository } from '../../../../../../infra/repositories/tenant-ai-provider.repository';

export const runtime = 'nodejs';

function extractTenantId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('tenants');
  if (idx === -1 || !segments[idx + 1]) {
    throw new Error('tenantId is required');
  }
  return segments[idx + 1];
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = extractTenantId(request);
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
