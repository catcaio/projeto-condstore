import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { users } from '@/drizzle/schema';
import { createSessionToken, COOKIE_NAME } from '@/infra/auth/session';
import { structuredLogger } from '@/infra/log/logger';
import { eq } from 'drizzle-orm';
import { getPublicAppUrl } from '@/infra/env/critical-runtime';
import { provisionNewTenant, resolveTenantByPolicy } from '@/modules/auth/provisioning';

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
    const REDIRECT_URI_BASE = getPublicAppUrl();
    const baseUrl = REDIRECT_URI_BASE;

    const code = request.nextUrl.searchParams.get('code');
    const stateFromQuery = request.nextUrl.searchParams.get('state');
    const stateFromCookie = request.cookies.get('google_oauth_state')?.value;

    // ── 1. Validate state (CSRF protection) ───────────────────────────
    if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
        structuredLogger.warn('google_oauth_invalid_state', {
            eventType: 'auth_security',
            hasQuery: !!stateFromQuery,
            hasCookie: !!stateFromCookie,
        });
        const response = NextResponse.redirect(`${baseUrl}/login?error=google_invalid_state`);
        response.cookies.delete('google_oauth_state');
        return response;
    }

    if (!code) {
        return NextResponse.redirect(`${baseUrl}/login?error=google_no_code`);
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
        return NextResponse.redirect(`${baseUrl}/login?error=google_not_configured`);
    }

    try {
        // ── 2. Exchange code for tokens ───────────────────────────────
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

        // ── 3. Get user info ──────────────────────────────────────────
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });

        if (!userInfoRes.ok) {
            return NextResponse.redirect(`${baseUrl}/login?error=google_userinfo_failed`);
        }

        const googleUser = await userInfoRes.json() as GoogleUserInfo;

        if (googleUser.email_verified !== true) {
            structuredLogger.warn('google_oauth_email_not_verified', {
                eventType: 'auth_security',
            });
            return NextResponse.redirect(`${baseUrl}/login?error=google_email_not_verified`);
        }

        const normalizedEmail = googleUser.email.toLowerCase().trim();
        const db = await getDb();

        // ── 4. Find existing user ─────────────────────────────────────
        const existingUsers = await db
            .select()
            .from(users)
            .where(eq(users.email, normalizedEmail));

        let user = existingUsers[0];

        if (user) {
            // Conta já existe → verificar hijack. Apenas permitir se já for google.
            if (user.authProvider !== 'google') {
                structuredLogger.warn('google_oauth_account_takeover_blocked', {
                    eventType: 'auth_security',
                    existingProvider: user.authProvider,
                    attemptedProvider: 'google',
                    email: normalizedEmail,
                });
                return NextResponse.redirect(`${baseUrl}/login?error=account_exists_different_provider`);
            }

            // Validar providerId (Google sub)
            if (user.providerId && user.providerId !== googleUser.sub) {
                structuredLogger.error('google_oauth_provider_id_mismatch', {
                    eventType: 'auth_security',
                    userId: user.id,
                    existingSub: user.providerId,
                    receivedSub: googleUser.sub,
                });
                return NextResponse.redirect(`${baseUrl}/login?error=google_provider_id_mismatch`);
            }

            // Se providerId estiver vazio (legado ou transição), atualiza agora
            if (!user.providerId) {
                await db.update(users).set({ providerId: googleUser.sub }).where(eq(users.id, user.id));
                structuredLogger.info('google_oauth_provider_id_updated', {
                    userId: user.id,
                });
            }
        } else {
            // ── 5. New user → create safely server-side ─────────────────
            
            // Resolve tenant (domain check or new provisioning)
            let tenantId = await resolveTenantByPolicy(normalizedEmail);
            let role: 'admin' | 'operator' | 'manager' | 'viewer' = 'operator';

            if (!tenantId) {
                const provisioned = await provisionNewTenant(googleUser.name || 'Usuário Google', normalizedEmail);
                tenantId = provisioned.tenantId;
                role = provisioned.role;
            }

            const userId = crypto.randomUUID();
            await db.insert(users).values({
                id: userId,
                email: normalizedEmail,
                name: googleUser.name,
                authProvider: 'google',
                providerId: googleUser.sub,
                tenantId,
                role,
                emailVerifiedAt: new Date(),
                sessionVersion: 1,
            });

            structuredLogger.info('google_oauth_user_created', {
                eventType: 'auth_google',
                userId,
                tenantId,
            });

            // Fetch newly created user for session
            const newUsers = await db.select().from(users).where(eq(users.id, userId));
            user = newUsers[0];
        }

        // ── 6. Create session ─────────────────────────────────────────
        const sessionToken = await createSessionToken({
            id: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role as any,
            sessionVersion: user.sessionVersion,
        });

        structuredLogger.info('google_login_success', {
            eventType: 'auth_google',
            userId: user.id,
            tenantId: user.tenantId,
        });

        const response = NextResponse.redirect(`${baseUrl}/cockpit`);
        response.cookies.delete('google_oauth_state');
        response.cookies.set(COOKIE_NAME, sessionToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 8 * 60 * 60,
        });

        return response;
    } catch (error) {
        structuredLogger.error('google_oauth_error', {
            eventType: 'auth_google',
            error,
        });
        const response = NextResponse.redirect(`${baseUrl}/login?error=google_internal`);
        response.cookies.delete('google_oauth_state');
        return response;
    }
}

