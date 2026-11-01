import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { eq, and, sql } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { requireInternalAuth } from '@/infra/auth/require-internal-auth';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    // Unified guard: dev-only + requires internal token or admin session
    const authResult = await requireInternalAuth(request, {
        purpose: ['diag'],
        blockUnlessDev: true,
    });
    if (!authResult.ok) return authResult.response;

    try {
        const forceRole = request.nextUrl.searchParams.get('role');
        const forceTenant = request.nextUrl.searchParams.get('tenantId');

        // Impersonation security guard: only allowed if explicit diagnostic authorization is granted
        const hasImpersonationParams = Boolean(forceRole || forceTenant);
        const allowImpersonation = request.nextUrl.searchParams.get('allowImpersonation') === 'true' ||
            request.headers.get('x-dev-allow-impersonation') === 'true';

        if (hasImpersonationParams && !allowImpersonation) {
            return NextResponse.json(
                { error: 'Impersonating tenantId or role requires explicit diagnostic authorization (allowImpersonation=true)' },
                { status: 403 }
            );
        }

        const db = await getDb();

        // If forceTenant is provided, validate that the tenant actually exists in DB
        if (forceTenant) {
            const tenantCheck = await db.execute(sql`SELECT id FROM tenants WHERE id = ${forceTenant} LIMIT 1`);
            const foundTenants = Array.isArray(tenantCheck) && Array.isArray(tenantCheck[0])
                ? tenantCheck[0]
                : (Array.isArray(tenantCheck) ? tenantCheck : []);

            if (foundTenants.length === 0) {
                return NextResponse.json(
                    { error: `Target tenant '${forceTenant}' does not exist` },
                    { status: 404 }
                );
            }
        }

        let user;
        try {
            if (forceTenant) {
                const results = await db
                    .select()
                    .from(users)
                    .where(and(eq(users.role, 'admin'), eq(users.tenantId, forceTenant)))
                    .limit(1);
                if (results.length > 0) user = results[0];
            } else {
                const results = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
                if (results.length > 0) user = results[0];
            }
        } catch (dbError) {
            logger.warn('Failed to query DB for dev session, using mock user', { error: String(dbError) });
        }

        if (!user && !forceTenant) {
            return NextResponse.json(
                { error: 'No admin user found and no valid tenantId specified' },
                { status: 400 }
            );
        }

        const targetTenant = forceTenant || user?.tenantId;
        if (!targetTenant) {
            return NextResponse.json(
                { error: 'Cannot determine tenant context for dev session' },
                { status: 400 }
            );
        }

        if (!user || forceRole || forceTenant) {
            user = {
                id: user?.id || 'mock-admin',
                email: user?.email || 'admin@condstore.local',
                tenantId: targetTenant,
                role: (forceRole as any) || user?.role || 'admin',
                sessionVersion: user?.sessionVersion || 1
            };
        }

        const sessionToken = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            sessionVersion: user.sessionVersion,
        });

        logger.info('Dev session token generated', { role: user.role });

        const response = NextResponse.json({
            success: true,
            user: { email: user.email, role: user.role },
            message: 'Dev session gerada com sucesso e cookie setado.'
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
        logger.error('Error generating dev session', error as Error);
        return NextResponse.json({ error: 'Erro ao gerar dev session' }, { status: 500 });
    }
}
