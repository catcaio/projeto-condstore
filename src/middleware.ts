import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'condstore_session';

// DEV ONLY: allow cockpit access without login when explicitly enabled.
// Default is OFF. Works only in NODE_ENV=development.
const DEV_BYPASS_COCKPIT =
  process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_COCKPIT === '1';

const PUBLIC_PATHS = [
  '/login',
  '/robots.txt',
  '/sitemap.xml',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/webhook',
  '/api/health',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode('dev-only-fallback-secret-do-not-use-in-prod');
  }
  return new TextEncoder().encode(secret);
}

const addSecurityHeaders = (response: NextResponse) => {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // DEV bypass: ONLY for /cockpit UI routes (never for /api)
  if (DEV_BYPASS_COCKPIT && pathname.startsWith('/cockpit') && !pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Public paths: skip auth
  if (isPublicPath(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check session cookie
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (!token) {
    return handleUnauthenticated(request, pathname);
  }

  // Verify JWT
  try {
    const { payload } = await jwtVerify(token, getSecret());

    const userId = payload.sub as string;
    const email = payload.email as string;
    const tenantId = payload.tenantId as string;
    const role = payload.role as string;

    if (!userId || !tenantId) {
      return handleUnauthenticated(request, pathname);
    }

    // Set auth context headers for route handlers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', userId);
    if (email) requestHeaders.set('x-user-email', email);
    requestHeaders.set('x-tenant-id', tenantId);
    if (role) requestHeaders.set('x-user-role', role);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  } catch {
    return handleUnauthenticated(request, pathname);
  }
}

function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
  // API routes: return 401 JSON
  if (pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }));
  }

  // UI routes: redirect to login
  const loginUrl = new URL('/login', request.url);
  return addSecurityHeaders(NextResponse.redirect(loginUrl));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
