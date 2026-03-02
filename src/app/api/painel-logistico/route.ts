import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextResponse, NextRequest } from 'next/server';
import { isInternalTokenAuthorized } from '@/infra/config/internal-token';

async function _POST(request: NextRequest) {
    const token = request.headers.get('x-internal-token');
    if (!isInternalTokenAuthorized(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    try {
        const body = await request.json();
        return NextResponse.json({
            ok: true,
            received: body,
            message: 'Logistics Panel API is online',
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({
            ok: false,
            error: 'Invalid JSON body',
            timestamp: new Date().toISOString(),
        }, { status: 400 });
    }
}

async function _GET(request: NextRequest) {
    const token = request.headers.get('x-internal-token');
    if (!isInternalTokenAuthorized(token)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
        ok: true,
        message: 'Logistics Panel API (GET)',
        timestamp: new Date().toISOString()
    });
}

export const GET = withGlobalErrorInterceptor(_GET);

export const POST = withGlobalErrorInterceptor(_POST);
