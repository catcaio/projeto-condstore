import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextResponse, NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { hashPassword } from '@/infra/auth/password';
import { sql, eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';

import { getInternalExportTokenOrThrow } from '@/infra/config/internal-token';

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function _GET(request: NextRequest) {
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
        const adminEmail = 'admin@condstore.local';
        const adminSeedPassword = process.env.ADMIN_SEED_PASSWORD;
        if (!adminSeedPassword) {
            return NextResponse.json(
                { success: false, error: 'ADMIN_SEED_PASSWORD missing' },
                { status: 500 }
            );
        }

        // Ensure tenant exists for admin user to link to
        // We'll insert a fallback default tenant if none exists, or fetch the first one.
        let tenantId = 'condstore-admin-tenant';
        const existingTenants = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);

        if (Array.isArray(existingTenants) && existingTenants.length > 0 && Array.isArray(existingTenants[0]) && existingTenants[0].length > 0) {
            tenantId = (existingTenants[0][0] as any).id;
        } else {
            // Insert default tenant if missing
            await db.execute(sql`
                INSERT IGNORE INTO tenants (id, name, twilio_number) 
                VALUES (${tenantId}, 'Condstore Admin', 'whatsapp:+5511999999999')
           `);
        }

        // Check if user exists
        const existingAdmin = await db.select().from(users).where(eq(users.email, adminEmail)).limit(1);

        if (existingAdmin.length === 0) {
            const passwordHash = hashPassword(adminSeedPassword);

            await db.insert(users).values({
                id: randomUUID(),
                email: adminEmail,
                passwordHash: passwordHash,
                tenantId: tenantId,
                role: 'admin',
            });

            return NextResponse.json({ success: true, message: 'Admin user created successfully.' });
        }

        return NextResponse.json({ success: true, message: 'Admin user already exists.' });
    } catch (error: any) {
        logger.error('seed_admin.failed', error as Error);
        return NextResponse.json({ success: false, error: error?.message ?? String(error) }, { status: 500 });
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
