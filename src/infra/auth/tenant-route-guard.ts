import { NextRequest, NextResponse } from 'next/server';
import { getInternalExportTokenOrThrow } from '@/core/config/internal-token';
import { getSessionUser, type SessionPayload } from './session';
import { safeCompare } from '../../lib/security/safe-compare';

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

export async function requireAdminSession(
  request: NextRequest,
): Promise<{ ok: true; sessionUser: SessionPayload; tenantId: string } | { ok: false; response: NextResponse }> {
  const sessionUser = await getSessionUser(request);
  if (!sessionUser?.tenantId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }),
    };
  }

  if (sessionUser.role !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'FORBIDDEN', message: 'Admin role required' }, { status: 403 }),
    };
  }

  return { ok: true, sessionUser, tenantId: sessionUser.tenantId };
}

export type InternalTokenPurpose = 'diag' | 'export' | 'jobs' | 'qa_bootstrap' | 'any';

export function requireInternalToken(
  request: NextRequest,
  options: { purpose?: InternalTokenPurpose[] } = { purpose: ['any'] }
): { ok: true } | { ok: false; response: NextResponse } {
  const token = request.headers.get('x-internal-token') || new URL(request.url).searchParams.get('token');
  const qaToken = request.headers.get('x-qa-bootstrap'); // Fallback for QA E2E
  const purposes = options.purpose || ['any'];

  // QA Bootstrap
  if (purposes.includes('qa_bootstrap') || purposes.includes('any')) {
    if (safeCompare(qaToken, process.env.QA_BOOTSTRAP_TOKEN)) return { ok: true };
  }

  // Jobs / Cron
  if (purposes.includes('jobs') || purposes.includes('any')) {
    if (safeCompare(token, process.env.INTERNAL_JOB_TOKEN)) return { ok: true };
    if (safeCompare(token, process.env.INTERNAL_TOKEN)) return { ok: true }; // legacy fallback
  }

  // Diag & Export
  if (purposes.includes('diag') || purposes.includes('export') || purposes.includes('any')) {
    // try/catch so we don't break routes that don't need export token if it's missing in prod
    try {
      const diagOrExportToken = getInternalExportTokenOrThrow();
      if (safeCompare(token, diagOrExportToken)) return { ok: true };
    } catch {
      // Proceed to fallback error below if token is not configured and we are in prod
    }
    // Also check explicit env vars just in case
    if (safeCompare(token, process.env.INTERNAL_DIAG_TOKEN)) return { ok: true };
    if (safeCompare(token, process.env.INTERNAL_EXPORT_TOKEN)) return { ok: true };
  }

  return { ok: false, response: NextResponse.json({ error: 'UNAUTHORIZED', message: 'Internal token missing or invalid' }, { status: 401 }) };
}
