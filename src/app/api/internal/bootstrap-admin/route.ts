import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getDb } from '@/infra/db';
import { users, tenantSignupPolicies } from '@/drizzle/schema';
import { sql, eq } from 'drizzle-orm';
import { structuredLogger } from '@/infra/log/logger';
import { safeCompare } from '@/lib/security/safe-compare';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        // 1. Validate tokens
        const internalToken = request.headers.get('x-internal-token');
        const bootstrapToken = request.headers.get('x-bootstrap-token');

        const expectedInternalToken = process.env.INTERNAL_TOKEN;
        const expectedBootstrapToken = process.env.BOOTSTRAP_TOKEN;

        if (!expectedInternalToken || !expectedBootstrapToken) {
            return NextResponse.json({ success: false, error: 'Tokens not configured in environment' }, { status: 503 });
        }

        if (!safeCompare(internalToken, expectedInternalToken) || !safeCompare(bootstrapToken, expectedBootstrapToken)) {
            structuredLogger.warn('bootstrap_admin_unauthorized', { eventType: 'admin_bootstrap' });
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Extract explicit admin email from body
        const body = await request.json().catch(() => ({}));
        const adminEmail = body.email?.toLowerCase().trim() || 'rafael@condstoreos.com';
        const name = body.name || 'Admin';

        // 3. Prevent multiple executions - ONLY IF admins == 0
        const db = await getDb();
        const [{ count: adminCount }] = await db.execute(sql`SELECT COUNT(*) as count FROM users WHERE role = 'admin'`) as any;

        if (adminCount > 0) {
            structuredLogger.warn('bootstrap_admin_blocked', { eventType: 'admin_bootstrap', reason: 'admins_exist' });
            return NextResponse.json({ success: false, error: 'Bootstrap locked: Admins already exist' }, { status: 403 });
        }

        // 4. Ensure a Tenant exists
        let tenantId = 'condstore-prod-tenant';
        const existingTenants = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);

        if (Array.isArray(existingTenants) && existingTenants.length > 0 && Array.isArray(existingTenants[0]) && existingTenants[0].length > 0) {
            tenantId = (existingTenants[0][0] as any).id;
        } else {
            await db.execute(sql`
                INSERT IGNORE INTO tenants (id, name, twilio_number) 
                VALUES (${tenantId}, 'Condstore OS', 'whatsapp:+5511999999999')
            `);
        }

        // 5. Ensure Signup Policies exist 
        const existingPolicy = await db.select().from(tenantSignupPolicies).where(eq(tenantSignupPolicies.tenantId, tenantId));
        if (existingPolicy.length === 0) {
            await db.insert(tenantSignupPolicies).values({
                tenantId,
                selfSignupEnabled: true,
                allowedDomains: [],
                allowedEmails: [adminEmail],
            });
        }

        // 6. Create the Admin User logic
        const existingUser = await db.select().from(users).where(eq(users.email, adminEmail));
        let userId;

        if (existingUser.length > 0) {
            // Upgrade existing user
            userId = existingUser[0].id;
            await db.update(users).set({
                role: 'admin',
                tenantId: tenantId,
                emailVerifiedAt: new Date(),
            }).where(eq(users.id, userId));
        } else {
            // Create new admin structure (without password, they will use 'forgot password' or google auth)
            userId = randomUUID();
            await db.insert(users).values({
                id: userId,
                email: adminEmail,
                name: name,
                authProvider: 'email',
                passwordHash: null, // Forces user to reset password to login via email
                tenantId: tenantId,
                role: 'admin',
                emailVerifiedAt: new Date(),
                sessionVersion: 1,
            });
        }

        structuredLogger.info('bootstrap_admin_success', {
            eventType: 'admin_bootstrap',
            email: adminEmail,
            tenantId,
            userId
        });

        // 7. Add to CONDSTORE_ADMIN_EMAILS in runtime memory (optional safety net)
        process.env.CONDSTORE_ADMIN_EMAILS = [process.env.CONDSTORE_ADMIN_EMAILS, adminEmail].filter(Boolean).join(',');

        return NextResponse.json({
            success: true,
            message: 'Bootstrap complete. Admin user created/upgraded.',
            email: adminEmail,
            instruction: 'Use forgot password flow or Google OAuth to set credentials and login.'
        });

    } catch (e: any) {
        structuredLogger.error('bootstrap_admin_failed', { eventType: 'admin_bootstrap', error: e });
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
