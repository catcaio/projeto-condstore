import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js middleware.
 * Handles security headers for all API routes.
 * Rate limiting is handled at the route level via Redis (see rate-limiter.ts).
 */
export function middleware(request: NextRequest) {
    const response = NextResponse.next();

    // Security Headers
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
