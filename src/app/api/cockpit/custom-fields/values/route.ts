import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { customFieldsService } from '@/modules/custom-fields/custom-fields.service';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(req.url);
        const entityId = searchParams.get('entityId');

        if (!entityId) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing entityId parameter');
        }

        const tenantId = auth.session.tenantId;

        const values = await customFieldsService.getEntityValues(tenantId, entityId);
        return NextResponse.json({ ok: true, data: values });
    } catch (e) {
        console.error('[GET /api/cockpit/custom-fields/values]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_values_fetch_failed'
        });
    }
}

const setValuesSchema = z.object({
    entity: z.enum(['customer', 'conversation', 'order', 'shipment', 'pipeline']),
    entityId: z.string().min(1),
    values: z.array(z.object({
        fieldKey: z.string(),
        value: z.string().nullable()
    }))
});

export async function POST(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const tenantId = auth.session.tenantId;
        const sub = auth.session.sub;

        const rawBody = await req.json();
        const payload = setValuesSchema.parse(rawBody);

        await customFieldsService.setEntityValues(
            tenantId, 
            payload.entity, 
            payload.entityId, 
            payload.values, 
            sub
        );

        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Validation Error');
        }
        console.error('[POST /api/cockpit/custom-fields/values]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_values_set_failed'
        });
    }
}
