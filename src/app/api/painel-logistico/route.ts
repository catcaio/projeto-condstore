import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        return NextResponse.json({
            ok: true,
            received: body,
            message: 'Logistics Panel API is online',
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        return NextResponse.json({
            ok: false,
            error: 'Invalid JSON body',
            timestamp: new Date().toISOString(),
        }, { status: 400 });
    }
}

export async function GET() {
    return NextResponse.json({
        ok: true,
        message: 'Logistics Panel API (GET)',
        timestamp: new Date().toISOString()
    })
}
