import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getSessionUser } from '@/infra/auth/session';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { attachRequestIdHeader, makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { invalidateSessions } from '@/modules/auth/invalidateSessions';

function clearAuthCookie(response: NextResponse): NextResponse {
    response.cookies.set(COOKIE_NAME, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
    });
    return response;
}

async function _POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    try {
        const session = await getSessionUser(request);
        if (session?.sub) {
            await invalidateSessions(session.sub);
        }

        const response = NextResponse.json({ success: true }, { status: 200 });
        clearAuthCookie(response);
        return attachRequestIdHeader(response, requestId);
    } catch (error) {
        logger.error('Logout failed', error as Error, { requestId });
        const response = errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Failed to logout');
        clearAuthCookie(response);
        return response;
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
