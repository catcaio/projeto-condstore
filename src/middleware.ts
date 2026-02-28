import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only enforce the token in production
    if (process.env.NODE_ENV === 'production' && request.nextUrl.pathname.startsWith('/api/internal/')) {
        const token = request.headers.get('x-internal-token');
        const diagToken = process.env.INTERNAL_DIAG_TOKEN?.trim();
        const exportToken = process.env.INTERNAL_EXPORT_TOKEN?.trim();
        const jobToken = process.env.INTERNAL_JOB_TOKEN?.trim();

        const isAuthorized = token && (token === diagToken || token === exportToken || token === jobToken);

        if (!isAuthorized) {
            return NextResponse.json(
                { error: 'Unauthorized internal access' },
                { status: 401 }
            );
        }
    }

    return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
    matcher: [
        '/api/internal/:path*',
    ],
};
