import { jwtVerify, type JWTPayload } from 'jose';
import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE_NAME = 'condstore_session';

export const config = {
  matcher: [
    '/cockpit/:path*',
    '/api/cockpit/:path*',
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

function unauthorizedResponse(req: NextRequest): NextResponse {
  if (isCockpitApi(req.nextUrl.pathname)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const loginUrl = new URL('/login', req.url);
  const nextPath = `${req.nextUrl.pathname}${req.nextUrl.search}`;
  if (nextPath && nextPath !== '/cockpit') {
    loginUrl.searchParams.set('next', nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return unauthorizedResponse(req);
  }

  const session = await verifyMiddlewareSessionToken(token);
  if (!session) {
    return unauthorizedResponse(req);
  }

  const headers = new Headers(req.headers);
  headers.delete('x-tenant-id');
  headers.delete('x-user-id');
  headers.delete('x-role');
  headers.set('x-auth-user-id', session.sub);
  headers.set('x-auth-tenant-id', session.tenantId);
  headers.set('x-auth-role', session.role);

  return NextResponse.next({
    request: {
      headers,
    },
  });
}
