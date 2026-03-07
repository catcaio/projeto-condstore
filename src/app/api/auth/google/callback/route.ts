export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { structuredLogger } from '@/infra/log/logger';
import { eq } from 'drizzle-orm';

interface GoogleTokenResponse {
    access_token: string;
    id_token: string;
    token_type: string;
}

interface GoogleUserInfo {
    sub: string;
    email: string;
    name: string;
    picture: string;
    email_verified: boolean;
}

export async function GET(request: NextRequest) {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
    const REDIRECT_URI_BASE = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

    const code = request.nextUrl.searchParams.get('code');
    const baseUrl = REDIRECT_URI_BASE;

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/login?error=google_no_code`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.redirect(`${baseUrl}/login?error=google_not_configured`);
    }

    try {
        // ── 1. Exchange code for tokens ───────────────────────────────
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: GOOGLE_CLIENT_ID,
                client_secret: GOOGLE_CLIENT_SECRET,
                redirect_uri: `${baseUrl}/api/auth/google/callback`,
                grant_type: 'authorization_code',
            }),
        });

        if (!tokenRes.ok) {
            structuredLogger.error('google_oauth_token_failed', {
                eventType: 'auth_google',
                status: tokenRes.status,
            });
            return NextResponse.redirect(`${baseUrl}/login?error=google_token_failed`);
        }

        const tokenData = await tokenRes.json() as GoogleTokenResponse;

        // ── 2. Get user info ──────────────────────────────────────────
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userInfoRes.ok) {
            return NextResponse.redirect(`${baseUrl}/login?error=google_userinfo_failed`);
        }

        const googleUser = await userInfoRes.json() as GoogleUserInfo;
        const normalizedEmail = googleUser.email.toLowerCase().trim();

        // ── 3. Find existing user ─────────────────────────────────────
        const db = await getDb();
        const existingUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail))
            ;

        const existingUser = existingUsers[0];

        if (existingUser) {
            // User exists → update provider info if needed, create session
            if (existingUser.authProvider !== 'google') {
                await db
                    .update(users)
                    .set({ authProvider: 'google', providerId: googleUser.sub, name: existingUser.name || googleUser.name, emailVerifiedAt: new Date() })
                    .where(eq(users.id, existingUser.id));
            }

            const token = await createSessionToken({
                id: existingUser.id,
                email: existingUser.email,
                tenantId: existingUser.tenantId,
                role: existingUser.role,
                sessionVersion: existingUser.sessionVersion,
            });

            structuredLogger.info('google_login_success', {
                eventType: 'auth_google',
                userId: existingUser.id,
                tenantId: existingUser.tenantId,
            });

            const response = NextResponse.redirect(`${baseUrl}/cockpit`);
            response.cookies.set(COOKIE_NAME, token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 8 * 60 * 60,
            });
            return response;
        }

        // ── 4. New user → redirect to signup with Google context ──────
        const signupParams = new URLSearchParams({
            provider: 'google',
            email: normalizedEmail,
            name: googleUser.name || '',
        });

        return NextResponse.redirect(`${baseUrl}/signup?${signupParams.toString()}`);
    } catch (error) {
        structuredLogger.error('google_oauth_error', {
            eventType: 'auth_google',
            error,
        });
        return NextResponse.redirect(`${baseUrl}/login?error=google_internal`);
    }
}
