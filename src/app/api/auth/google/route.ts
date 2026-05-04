export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getEnvMisconfigurationResponse } from '@/infra/env/require-env';
import { getPublicAppUrl } from '@/infra/env/critical-runtime';

export async function GET() {
    const requestId = `google-${Date.now()}`;
    const misconfigured = getEnvMisconfigurationResponse(requestId, 'auth');
    if (misconfigured) return misconfigured;

    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
    const REDIRECT_URI_BASE = getPublicAppUrl();

    if (!GOOGLE_CLIENT_ID) {
        return NextResponse.redirect(`${REDIRECT_URI_BASE}/login?error=google_not_configured`);
    }

    const redirectUri = `${REDIRECT_URI_BASE}/api/auth/google/callback`;
    
    // ── Generate secure state for CSRF protection ───────────────────
    const state = crypto.randomBytes(32).toString('hex');
    
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
        state,
    });

    const response = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
    
    // Save state in a secure, httpOnly cookie (valid for 10 min)
    response.cookies.set('google_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 minutes
    });

    return response;
}
