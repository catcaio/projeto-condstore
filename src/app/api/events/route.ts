import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '../../../modules/analytics/analytics.service';
import { z } from 'zod';

const eventSchema = z.object({
    event: z.string().min(1).max(64),
    path: z.string().min(1).max(200),
    props: z.record(z.string(), z.any()).optional(),
});

export async function POST(request: NextRequest) {
    try {
        const bodyObj = await request.json();
        const parseResult = eventSchema.safeParse(bodyObj);

        if (!parseResult.success) {
            return NextResponse.json({ ok: false, error: 'Invalid payload schema' }, { status: 400 });
        }

        const { event, path, props } = parseResult.data;

        // 🔒 Validate 4KB limits strictly to avoid payload bloat
        let propsString: string | undefined = undefined;
        if (props) {
            propsString = JSON.stringify(props);
            if (propsString.length > 4096) {
                return NextResponse.json({ ok: false, error: 'Payload limits exceeded (Max 4096 chars)' }, { status: 400 });
            }
        }

        // 🔒 Anonymous Identity Management (Strict crypto.randomUUID implementation constraint)
        let anonId = request.cookies.get('condstore_anon')?.value;
        let isNewAnonId = false;

        if (!anonId) {
            anonId = crypto.randomUUID();
            isNewAnonId = true;
        }

        const userAgent = request.headers.get('user-agent') || undefined;

        // Async fire-and-forget logic (Resilient - won't throw out to surface)
        await analyticsService.logEvent({
            anonId,
            event,
            path,
            props: propsString,
            userAgent
        });

        const response = NextResponse.json({ ok: true });

        if (isNewAnonId) {
            response.cookies.set('condstore_anon', anonId, {
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
                maxAge: 60 * 60 * 24 * 180, // 180 Days
                path: '/',
            });
        }

        return response;

    } catch (err) {
        // Prevent generic breaking. Endpoints receiving payloads blindly might be hit heavily.
        console.error('[Events API] Unhandled ingest error:', err);
        return NextResponse.json({ ok: false, error: 'Internal Ingest Error' }, { status: 500 });
    }
}
