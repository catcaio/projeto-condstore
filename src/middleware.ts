import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const COOKIE_NAME = 'condstore_session';

const PUBLIC_PATHS = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/webhook',
    '/api/health',
];

function isPublicPath(pathname: string): boolean {
    return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

function getSecret(): Uint8Array {
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
        throw new Error('AUTH_SECRET environment variable is required. Application cannot start without it.');
    }
    return new TextEncoder().encode(secret);
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Security headers for all responses
    const addSecurityHeaders = (response: NextResponse) => {
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        return response;
    };

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
        const { payload } = await jwtVerify(token, getSecret(), { algorithms: ['HS256'] });

        const userId = payload.sub as string;
        const tenantId = payload.tenantId as string;
        const role = payload.role as string;

        if (!userId || !tenantId) {
            return handleUnauthenticated(request, pathname);
        }

        // Set auth context headers for route handlers (no PII)
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-user-id', userId);
        requestHeaders.set('x-tenant-id', tenantId);
        requestHeaders.set('x-user-role', role);

        const response = NextResponse.next({
            request: { headers: requestHeaders },
        });

        return addSecurityHeaders(response);
    } catch {
        return handleUnauthenticated(request, pathname);
    }
}

function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
    const addSecurityHeaders = (response: NextResponse) => {
        response.headers.set('X-Frame-Options', 'DENY');
        response.headers.set('X-Content-Type-Options', 'nosniff');
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        return response;
    };

    // API routes: return 401 JSON
    if (pathname.startsWith('/api/')) {
        return addSecurityHeaders(
            NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        );
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
