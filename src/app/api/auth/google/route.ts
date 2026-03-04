export const runtime = 'nodejs';

import { NextResponse } from 'next/server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const REDIRECT_URI_BASE = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

export async function GET() {
    if (!GOOGLE_CLIENT_ID) {
        return NextResponse.json(
            { error: 'Google OAuth não configurado' },
            { status: 503 }
        );
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
