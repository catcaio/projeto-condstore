import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'condstore_session';

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*',
    '/api/webhook',
    '/api/events',
    '/api/tenants/:tenantId/ai-provider/:path*',
    '/api/tenants/:tenantId/settings/:path*',
  ],
};

function getAuthSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode('dev-only-fallback-secret-do-not-use-in-prod');
  }

  return new TextEncoder().encode(secret);
}

interface MiddlewareSessionClaims {
  sub: string;
  tenantId: string;
  role: string;
}

async function verifyMiddlewareSessionToken(token: string): Promise<MiddlewareSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret());
    const claims = payload as JWTPayload & {
      tenantId?: unknown;
      role?: unknown;
    };

    if (
      typeof claims.sub !== 'string' ||
      typeof claims.tenantId !== 'string' ||
      typeof claims.role !== 'string'
    ) {
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

function isCockpitUi(pathname: string): boolean {
  return pathname === '/cockpit' || pathname.startsWith('/cockpit/');
}

function isCockpitProtectedPath(pathname: string): boolean {
  return isCockpitApi(pathname) || isCockpitUi(pathname);
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
  if (nextPath && nextPath !== '/cockpit') {
    loginUrl.searchParams.set('next', nextPath);
  }

  return setRequestIdHeader(NextResponse.redirect(loginUrl), requestId);
}

export async function middleware(req: NextRequest) {
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
