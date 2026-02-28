import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'condstore_session';
const ALLOWED_ROLES = ['admin', 'operator', 'manager', 'viewer'] as const;
const ALLOWED_ROLES_SET = new Set<MiddlewareRole>(ALLOWED_ROLES);

type MiddlewareRole = (typeof ALLOWED_ROLES)[number];

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/home/:path*',
    '/inbox/:path*',
    '/freight/simulations/:path*',
    '/attribution/:path*',
    '/settings/:path*',
    '/api/cockpit/:path*',
    '/api/webhook',
    '/api/events',
    '/api/tenants/:tenantId/ai-provider/:path*',
    '/api/tenants/:tenantId/settings/:path*',
  ],
};

function hasAuthSecretConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET?.trim());
}

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MISCONFIG_AUTH_SECRET');
    }

    return new TextEncoder().encode('dev-only-fallback-secret-do-not-use-in-prod');
  }

  return new TextEncoder().encode(secret);
}

interface MiddlewareSessionClaims {
  sub: string;
  tenantId: string;
  role: MiddlewareRole;
}

function isMiddlewareRole(value: unknown): value is MiddlewareRole {
  return typeof value === 'string' && ALLOWED_ROLES_SET.has(value as MiddlewareRole);
}

async function verifyMiddlewareSessionToken(token: string): Promise<MiddlewareSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const claims = payload as JWTPayload & {
      tenantId?: unknown;
      role?: unknown;
    };

    if (typeof claims.sub !== 'string' || typeof claims.tenantId !== 'string' || !isMiddlewareRole(claims.role)) {
      return null;
    }

    return {
      sub: claims.sub,
      tenantId: claims.tenantId,
      role: claims.role,
    };
  } catch {
    return null;
  }
}

function isCockpitApi(pathname: string): boolean {
  return pathname === '/api/cockpit' || pathname.startsWith('/api/cockpit/');
}

function isProtectedUi(pathname: string): boolean {
  return (
    pathname === '/cockpit' || pathname.startsWith('/cockpit/') ||
    pathname === '/home' || pathname.startsWith('/home/') ||
    pathname === '/inbox' || pathname.startsWith('/inbox/') ||
    pathname === '/freight/simulations' || pathname.startsWith('/freight/simulations/') ||
    pathname === '/attribution' || pathname.startsWith('/attribution/') ||
    pathname === '/settings' || pathname.startsWith('/settings/')
  );
}

function isCockpitProtectedPath(pathname: string): boolean {
  return isCockpitApi(pathname) || isProtectedUi(pathname);
}

function getOrCreateRequestId(req: NextRequest): string {
  const fromHeader = req.headers.get('x-request-id')?.trim();
  if (fromHeader) return fromHeader;
  return crypto.randomUUID();
}

function setRequestIdHeader(response: NextResponse, requestId: string): NextResponse {
  response.headers.set('x-request-id', requestId);
  return response;
}

function unauthorizedResponse(req: NextRequest, requestId: string): NextResponse {
  if (isCockpitApi(req.nextUrl.pathname)) {
    return setRequestIdHeader(NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }), requestId);
  }

  const loginUrl = new URL('/login', req.url);
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (nextPath && !['/cockpit', '/home'].includes(nextPath)) {
    loginUrl.searchParams.set('next', nextPath);
  }

  return setRequestIdHeader(NextResponse.redirect(loginUrl), requestId);
}

function authSecretMisconfiguredResponse(req: NextRequest, requestId: string): NextResponse {
  if (isCockpitApi(req.nextUrl.pathname)) {
    return setRequestIdHeader(NextResponse.json({ error: 'MISCONFIG_AUTH_SECRET' }, { status: 500 }), requestId);
  }

  if (isProtectedUi(req.nextUrl.pathname)) {
    return setRequestIdHeader(
      new NextResponse('MISCONFIG_AUTH_SECRET', {
        status: 500,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
      }),
      requestId,
    );
  }

  return setRequestIdHeader(NextResponse.json({ error: 'MISCONFIG_AUTH_SECRET' }, { status: 500 }), requestId);
}

export async function proxy(req: NextRequest) {
  const requestId = getOrCreateRequestId(req);
  const headers = new Headers(req.headers);
  headers.set('x-request-id', requestId);

  if (!isCockpitProtectedPath(req.nextUrl.pathname)) {
    return setRequestIdHeader(
      NextResponse.next({
        request: {
          headers,
        },
      }),
      requestId,
    );
  }

  if (process.env.NODE_ENV === 'production' && !hasAuthSecretConfigured()) {
    return authSecretMisconfiguredResponse(req, requestId);
  }

  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return unauthorizedResponse(req, requestId);
  }

  const session = await verifyMiddlewareSessionToken(token);
  if (!session) {
    return unauthorizedResponse(req, requestId);
  }

  headers.delete('x-tenant-id');
  headers.delete('x-user-id');
  headers.delete('x-role');
  headers.set('x-auth-user-id', session.sub);
  headers.set('x-auth-tenant-id', session.tenantId);
  headers.set('x-auth-role', session.role);

  return setRequestIdHeader(
    NextResponse.next({
      request: {
        headers,
      },
    }),
    requestId,
  );
}
