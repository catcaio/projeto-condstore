import { NextResponse, NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { users, tenantSignupPolicies } from '@/drizzle/schema';
import { hashPassword } from '@/infra/auth/password';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { sql, eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { structuredLogger } from '@/infra/log/logger';

import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        if (process.env.IS_DEV !== 'true') {
            const allowed = process.env.ALLOW_SEED_ADMIN === 'true';
            if (!allowed) {
                logger.warn('seed_admin.blocked', { reason: 'ALLOW_SEED_ADMIN not true in non-dev env' });
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }

            const token = request.headers.get('x-internal-token') || request.nextUrl.searchParams.get('internal_token');
            let expectedInternalToken;
            try {
                expectedInternalToken = getInternalExportTokenOrThrow();
            } catch {
                return NextResponse.json({ success: false, error: 'Internal token not configured completely' }, { status: 403 });
            }

            if (!token || token !== expectedInternalToken) {
                logger.warn('seed_admin.blocked', { reason: 'Invalid or missing internal token' });
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
        } else {
            // In Development: Use SEED_TOKEN checking (header or query)
            const token = request.headers.get('x-seed-token') || request.nextUrl.searchParams.get('seed_token');
            if (!token || token !== process.env.SEED_TOKEN) {
                logger.warn('seed_admin.blocked', { reason: 'Invalid or missing dev seed token' });
                return NextResponse.json({ success: false, error: 'Unauthorized: missing or invalid seed token' }, { status: 401 });
            }
        }

        const dbUrl = process.env.DATABASE_URL;
        if (!dbUrl) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL missing' }, { status: 500 });
        }
        if (!dbUrl.includes('/lojacond')) {
            return NextResponse.json({ success: false, error: 'DATABASE_URL missing database name' }, { status: 500 });
        }

        const db = await getDb();
        const adminEmail = process.env.ADMIN_SEED_EMAIL || 'admin@condstore.local';
        const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
        if (!adminSeedPassword) {
            return NextResponse.json(
                { success: false, error: 'ADMIN_SEED_PASSWORD missing' },
                { status: 500 }
            );
        }

        // Ensure tenant exists
        let tenantId = 'condstore-admin-tenant';
        const existingTenants = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);

        if (Array.isArray(existingTenants) && existingTenants.length > 0 && Array.isArray(existingTenants[0]) && existingTenants[0].length > 0) {
            tenantId = (existingTenants[0][0] as any).id;
        } else {
            await db.execute(sql`
                INSERT IGNORE INTO tenants (id, name, twilio_number) 
                VALUES (${tenantId}, 'Condstore Admin', 'whatsapp:+5511999999999')
           `);
        }

        // ── Ensure tenant_signup_policies exists ──────────────────────────
        const existingPolicy = await db.select().from(tenantSignupPolicies).where(eq(tenantSignupPolicies.tenantId, tenantId));
        if (existingPolicy.length === 0) {
            await db.insert(tenantSignupPolicies).values({
                tenantId,
                selfSignupEnabled: true,
                allowedDomains: [],
                allowedEmails: [adminEmail.toLowerCase()],
            });
            structuredLogger.info('seed_admin_signup_policy_created', {
                eventType: 'admin_bootstrap',
                tenantId,
            });
        }

        // ── Create or update admin user ───────────────────────────────────
        const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail));

        if (existingAdmin.length === 0) {
            const passwordHash = hashPassword(adminSeedPassword);
            const userId = randomUUID();

            await db.insert(users).values({
                id: userId,
                email: adminEmail,
                name: 'Admin',
                passwordHash: passwordHash,
                authProvider: 'email',
                tenantId: tenantId,
                role: 'admin',
                emailVerifiedAt: new Date(), // Auto-verified for seed admin
            });

            // Create session and return cookie for instant login
            const sessionToken = await createSessionToken({
                id: userId,
                email: adminEmail,
                tenantId: tenantId,
                role: 'admin',
                sessionVersion: 1,
            });

            structuredLogger.info('admin_bootstrap_user_created', {
                eventType: 'admin_bootstrap',
                userId,
                tenantId,
                email: adminEmail,
            });

            const response = NextResponse.json({
                success: true,
                message: 'Admin user created successfully. Session cookie set — redirect to /home.',
                tenantId,
            });

            response.cookies.set(COOKIE_NAME, sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 8 * 60 * 60,
            });

            return response;
        }

        // User exists — reset password and issue session
        const passwordHash = hashPassword(adminSeedPassword);
        await db.execute(sql`
            UPDATE users
            SET password_hash = ${passwordHash},
                session_version = session_version + 1,
                email_verified_at = COALESCE(email_verified_at, NOW())
            WHERE email = ${adminEmail}
        `);

        const updatedUser = await db.select().from(users).where(eq(users.email, adminEmail));
        if (updatedUser[0]) {
            const sessionToken = await createSessionToken({
                id: updatedUser[0].id,
                email: updatedUser[0].email,
                tenantId: updatedUser[0].tenantId,
                role: updatedUser[0].role,
                sessionVersion: updatedUser[0].sessionVersion,
            });

            const response = NextResponse.json({
                success: true,
                message: 'Admin password reset and session created. Redirect to /home.',
                tenantId: updatedUser[0].tenantId,
            });

            response.cookies.set(COOKIE_NAME, sessionToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 8 * 60 * 60,
            });

            return response;
        }

        return NextResponse.json({ success: true, message: 'Admin user already exists.' });
    } catch (error: any) {
        logger.error('seed_admin.failed', error as Error);
        return NextResponse.json({ success: false, error: error?.message ?? String(error) }, { status: 500 });
    }
}
