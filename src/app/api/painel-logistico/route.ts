import { NextResponse } from 'next/server';

// This legacy endpoint has been decommissioned to reduce attack surface.
// All logistics panel functionality is available via /api/cockpit/* (requires auth).

const GONE_RESPONSE = NextResponse.json(
    { error: 'Gone', message: 'This endpoint has been decommissioned. Use /api/cockpit/* instead.' },
    { status: 410 }
);

export function GET() {
    return GONE_RESPONSE;
}

export function POST() {
    return GONE_RESPONSE;
}
