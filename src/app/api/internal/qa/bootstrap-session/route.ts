import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { logger } from '@/infra/logger';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
    // Unified guard: blocks production, accepts QA token or internal token or admin session
    const authResult = await requireInternalAuth(request, {
        purpose: ['qa_bootstrap'],
    });

    if (!authResult.ok) {
        logger.warn('[QA Bootstrap] BLOCKED', {
            path: request.nextUrl.pathname,
            method: request.method,
        });
        return authResult.response;
    }

    try {
        let forceRole = 'admin';
        let forceTenant = 'qa-tenant';
        
        try {
            const body = await request.clone().json();
            if (body.role) forceRole = body.role;
            if (body.tenantId) forceTenant = body.tenantId;
        } catch {
            // body might be empty or missing
        }

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

        logger.info('QA session token generated', { role: user.role });

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

        // Safety assert: ensure Set-Cookie was actually emitted
        if (!response.headers.get('set-cookie')) {
            logger.error('QA Bootstrap: Set-Cookie not present after cookie.set()', undefined, {
                cookieName: COOKIE_NAME,
                role: user.role,
                tenantId: user.tenantId,
            });
            return NextResponse.json({ error: 'Session cookie could not be set', code: 'bootstrap_cookie_missing' }, { status: 500 });
        }

        logger.info('QA session bootstrapped OK', { role: user.role, tenantId: user.tenantId });

        return response;

    } catch (error) {
        logger.error('Error generating QA session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
