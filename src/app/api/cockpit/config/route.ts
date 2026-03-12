import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { configService } from '@/modules/config/config.service';
import { setConfigSchema } from '@/modules/config/config.types';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category') || undefined;

        const tenantId = auth.session.tenantId;

        const configs = await configService.listConfigs(tenantId, category);
        return NextResponse.json({ ok: true, data: configs });
    } catch (e) {
        console.error('[GET /api/cockpit/config]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'config_fetch_failed'
        });
    }
}

export async function POST(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const tenantId = auth.session.tenantId;
        const sub = auth.session.sub; // using sub as userId

        const rawBody = await req.json();
        
        const payload = setConfigSchema.parse(rawBody);

        const result = await configService.setConfig({
            tenantId,
            key: payload.key,
            value: payload.value,
            category: payload.category as any,
            createdBy: sub,
        });

        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (e) {
        if (e instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Validation Error');
        }
        console.error('[POST /api/cockpit/config]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'config_set_failed'
        });
    }
}
