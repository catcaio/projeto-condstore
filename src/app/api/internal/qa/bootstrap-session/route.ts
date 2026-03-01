import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    const isCIAloowed = process.env.CI === 'true' || process.env.NODE_ENV !== 'production';

    if (!isCIAloowed) {
        return NextResponse.json({
            error: 'Forbidden',
            message: 'This endpoint is available in CI/development mode only'
        }, { status: 403 });
    }

    const token = request.headers.get('x-internal-token') || request.nextUrl.searchParams.get('token');

    // Allow either the CI token or existing dev token
    const validTokens = [
        process.env.INTERNAL_DIAG_TOKEN?.trim(),
        process.env.INTERNAL_TOKEN?.trim(),
        'condstore_dev_bypass_local_991'
    ].filter(Boolean);

    if (!token || !validTokens.includes(token)) {
        return NextResponse.json({
            error: 'Unauthorized',
        }, { status: 401 });
    }

    try {
        const forceRole = request.nextUrl.searchParams.get('role') || 'admin';
        const forceTenant = request.nextUrl.searchParams.get('tenantId') || 'LOJACOND';

        const user = {
            id: 'mock-admin',
            email: 'qa@condstore.com',
            tenantId: forceTenant,
            role: forceRole,
            sessionVersion: 1
        };

        const sessionToken = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            sessionVersion: user.sessionVersion,
        });

        logger.info('QA session token generated', { email: user.email, role: user.role });

        const response = NextResponse.json({
            success: true,
            user: { email: user.email, role: user.role },
            message: 'QA session bootstrapped'
        });

        response.cookies.set(COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60, // 8 hours
        });

        return response;

    } catch (error) {
        logger.error('Error generating QA session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
