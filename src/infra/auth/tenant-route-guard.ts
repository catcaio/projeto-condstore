import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser, type SessionPayload } from './session';

export function extractTenantIdFromTenantRoute(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  const idx = segments.indexOf('tenants');
  const tenantId = segments[idx + 1]?.trim();

  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  return tenantId;
}

type TenantRouteGuardResult =
  | { ok: true; tenantId: string; sessionUser: SessionPayload }
  | { ok: false; response: NextResponse };

export async function requireSessionTenantMatch(
  request: NextRequest,
  tenantId: string,
): Promise<TenantRouteGuardResult> {
  const normalizedTenantId = tenantId.trim();
  if (!normalizedTenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'tenantId is required' }, { status: 400 }),
    };
  }

  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  if (sessionUser.tenantId !== normalizedTenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 }),
    };
  }

  return { ok: true, tenantId: sessionUser.tenantId, sessionUser };
}
