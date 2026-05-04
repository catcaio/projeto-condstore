export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
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
    const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent',
    });

    return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
