import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenants, users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { isDevRuntime, isQaAutomation } from '@/infra/env/devOnly';

export const runtime = "nodejs";

async function _POST(request: NextRequest) {
  const internalGuard = requireInternalToken(request);
  if (!internalGuard.ok) return internalGuard.response;

    const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
    const isDev = isDevRuntime();
    const hasGithubHeader = request.headers.get('x-github-actions') === 'true';

    const token = request.headers.get('x-qa-token') || request.nextUrl.searchParams.get('token');
    const hasInternalTokenHeader = !!token;
    const isProdEnvironment = process.env.VERCEL_ENV === 'production';

    // 1. In real production, unequivocally block this route.
    if (isProdEnvironment) {
        logger.warn('[QA Setup] BLOCKED: Attempted to run QA route in production environment');
        return NextResponse.json({ error: "Unauthorized internal access", reason: "production_blocked" }, { status: 403 });
    }

    // 2. We must have a properly configured server token
    const serverQaToken = process.env.QA_BOOTSTRAP_TOKEN?.trim();
    if (!serverQaToken) {
        logger.warn('[QA Setup] BLOCKED: Server missing QA_BOOTSTRAP_TOKEN');
        return NextResponse.json({ error: "Unauthorized internal access", reason: "server_misconfigured" }, { status: 401 });
    }

    // 3. The token provided in request must match exactly. We don't fall back to bypass strings anymore.
    if (!hasInternalTokenHeader || token !== serverQaToken) {
        return NextResponse.json({ error: "Unauthorized internal access", reason: "bad_token" }, { status: 401 });
    }

    try {
        const db = await getDb();
        const tenantId = 'qa-tenant';

        // Ensure tenant exists
        const existingTenant = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        if (existingTenant.length === 0) {
            await db.insert(tenants).values({
                id: tenantId,
                name: 'QA Automation Tenant',
                twilioNumber: '5511999999999',
                plan: 'pro',
                planStatus: 'active',
                stripeCustomerId: 'cus_qa123',
                createdAt: new Date()
            });
        } else {
            // Reset plan if needed
            await db.update(tenants)
                .set({ plan: 'pro', planStatus: 'active' })
                .where(eq(tenants.id, tenantId));
        }

        const userId = 'mock-admin';
        const existingUser = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (existingUser.length === 0) {
            await db.insert(users).values({
                id: userId,
                email: 'qa@condstore.com',
                passwordHash: 'qa-mock-hash',
                role: 'admin',
                tenantId: tenantId,
                createdAt: new Date()
            });
        }

        logger.info('[QA Setup] Provisioned qa-tenant and mock-admin successfully');

        return NextResponse.json({ success: true, tenantId });
    } catch (e: any) {
        logger.error('[QA Setup] Database setup failed', e);
        return NextResponse.json({ error: 'Database setup failed', details: e.message }, { status: 500 });
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
