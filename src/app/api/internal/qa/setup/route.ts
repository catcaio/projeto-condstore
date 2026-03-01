import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenants, users } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '@/infra/logger';
import { isDevRuntime, isQaAutomation } from '@/infra/env/devOnly';
import { exec } from 'child_process';
import { promisify } from 'util';
import { createSessionToken } from '@/infra/auth/session';

export const runtime = "nodejs";

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
    const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
    const isDev = isDevRuntime();
    const hasGithubHeader = request.headers.get('x-github-actions') === 'true';

    const token = request.headers.get('x-qa-token') || request.nextUrl.searchParams.get('token');

    const validTokens = [
        process.env.QA_BOOTSTRAP_TOKEN?.trim(),
        isDev ? 'condstore_dev_bypass_local_991' : null
    ].filter(Boolean);

    const isAuthorized = !!token && validTokens.includes(token);

    if (!isAuthorized || (!isDev && (!isGithubActions || !hasGithubHeader))) {
        return NextResponse.json({ error: "Unauthorized QA setup" }, { status: 401 });
    }

    try {
        logger.info("[QA] Migrations should run in CI pipeline before this setup script.");

        let tenantId = 'qa-tenant';
        let userId = 'mock-admin';

        try {
            const db = await getDb();

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
        } catch (dbErr) {
            logger.warn('[QA Setup] DB provision queries failed (could be offline or bad schema): ' + String(dbErr));
        }

        const sessionToken = await createSessionToken({
            id: userId,
            email: 'qa@condstore.com',
            role: 'admin',
            tenantId: tenantId,
            sessionVersion: 1
        });

        const response = NextResponse.json({ success: true, tenantId });

        response.cookies.set('condstore_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        return response;
    } catch (e: any) {
        logger.warn('[QA Setup] Database setup failed (could be offline DB), falling back to generating session cookie anyway', e);

        // Fallback for isolated CI or completely offline local envs
        const sessionToken = await createSessionToken({
            id: 'mock-admin',
            email: 'qa@condstore.com',
            role: 'admin',
            tenantId: 'qa-tenant',
            sessionVersion: 1
        });

        const response = NextResponse.json({ success: true, tenantId: 'qa-tenant', warning: 'DB Offline' });
        response.cookies.set('condstore_session', sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7
        });

        return response;
    }
}
