import { NextResponse, NextRequest } from 'next/server';
import { requireInternalToken } from '@/infra/auth/tenant-route-guard';

export async function POST(request: NextRequest) {
    const authResult = requireInternalToken(request, { purpose: ['any'] });
    if (!authResult.ok) return authResult.response;
    try {
        const body = await request.json();
        return NextResponse.json({
            ok: true,
            received: body,
            message: 'Logistics Panel API is online',
            timestamp: new Date().toISOString(),
        });
    } catch {
        return NextResponse.json({
            ok: false,
            error: 'Invalid JSON body',
            timestamp: new Date().toISOString(),
        }, { status: 400 });
    }
}

export async function GET(request: NextRequest) {
    const authResult = requireInternalToken(request, { purpose: ['any'] });
    if (!authResult.ok) return authResult.response;
    return NextResponse.json({
        ok: true,
        message: 'Logistics Panel API (GET)',
        timestamp: new Date().toISOString()
    });
}
