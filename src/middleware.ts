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
  '/evolution',
  '/api/evolution',
  '/api/reports/ingest',
];

const TOKEN_PROTECTED_PATHS = [
  '/api/auth/seed-admin',
  '/api/reports/seed',
  '/api/db/migrate',
];

// ---------------------------------------------------------------------------
// RBAC — route-level access rules
// Each entry: { prefix, allowedRoles }
// Rules are evaluated top-to-bottom; first match wins.
// Routes not listed here require only a valid session (any role).
// ---------------------------------------------------------------------------
const RBAC_RULES: Array<{ prefix: string; allowedRoles: string[] }> = [
  { prefix: '/cockpit/tenants', allowedRoles: ['admin'] },
  { prefix: '/cockpit', allowedRoles: ['admin', 'manager'] },
  { prefix: '/api/cockpit', allowedRoles: ['admin', 'manager'] },
];

/** Returns true when `pathname` is at or under `prefix`. */
function pathnameMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix
    || pathname.startsWith(prefix + '/')
    || pathname.startsWith(prefix + '?');
}

/**
 * Returns true when `role` is permitted to access `pathname`.
 * Evaluates rules top-to-bottom; first matching prefix determines the result.
 * If no rule matches, access is allowed (any authenticated role).
 */
function isRoleAllowed(pathname: string, role: string): boolean {
  for (const rule of RBAC_RULES) {
    if (pathnameMatchesPrefix(pathname, rule.prefix)) {
      return rule.allowedRoles.includes(role);
    }
  }
  return true; // no matching rule → any authenticated role is fine
}

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET is not set in production');
    }
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

  // DEV bypass: allow testing metrics endpoints
  if (
    process.env.NODE_ENV === 'development' &&
    process.env.COCKPIT_METRICS_DEV_BYPASS === '1' &&
    pathname.startsWith('/api/cockpit/metrics')
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Public paths: skip auth
  if (isPublicPath(pathname)) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Token protected paths: skip JWT auth, they validate their own SEED_TOKEN in the handler
  if (TOKEN_PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
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

    // RBAC check — runs after authentication, before forwarding
    if (!isRoleAllowed(pathname, role ?? '')) {
      return handleForbidden(request, pathname);
    }

    // Set auth context headers for route handlers
    const requestHeaders = new Headers(request.headers);

    // SECURITY: Strip potentially spoofed headers from client
    requestHeaders.delete('x-user-id');
    requestHeaders.delete('x-user-email');
    requestHeaders.delete('x-tenant-id');
    requestHeaders.delete('x-user-role');

    // Inject verified headers from JWT
    requestHeaders.set('x-user-id', userId);
    if (email) requestHeaders.set('x-user-email', email);
    requestHeaders.set('x-tenant-id', tenantId);
    if (role) requestHeaders.set('x-user-role', role);

    const response = NextResponse.next({ request: { headers: requestHeaders } });
    return addSecurityHeaders(response);
  } catch (_err) {
    // JWT verification failed (expired, tampered, malformed) — treat as unauthenticated
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

function handleForbidden(request: NextRequest, pathname: string): NextResponse {
  // API routes: return 403 JSON
  if (pathname.startsWith('/api/')) {
    return addSecurityHeaders(NextResponse.json({ error: 'Forbidden' }, { status: 403 }));
  }

  // UI routes: redirect to /cockpit (safe fallback — already authenticated)
  const cockpitUrl = new URL('/cockpit', request.url);
  return addSecurityHeaders(NextResponse.redirect(cockpitUrl));
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
