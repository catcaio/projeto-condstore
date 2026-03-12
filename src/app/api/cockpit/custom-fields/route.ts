import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { customFieldsService } from '@/modules/custom-fields/custom-fields.service';
import { createCustomFieldSchema, customFieldEntitySchema } from '@/modules/custom-fields/custom-fields.types';
import { z } from 'zod';

export async function GET(req: NextRequest) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const { searchParams } = new URL(req.url);
        const entityStr = searchParams.get('entity');

        if (!entityStr) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Missing entity parameter');
        }

        const parsedEntity = customFieldEntitySchema.safeParse(entityStr);
        if (!parsedEntity.success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid entity parameter');
        }

        const tenantId = auth.session.tenantId;

        const fields = await customFieldsService.getFields(tenantId, parsedEntity.data);
        return NextResponse.json({ ok: true, data: fields });
    } catch (e) {
        console.error('[GET /api/cockpit/custom-fields]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_fetch_failed'
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
        const sub = auth.session.sub;

        const rawBody = await req.json();
        const payload = createCustomFieldSchema.parse(rawBody);

        const result = await customFieldsService.createField(tenantId, payload, sub);

        return NextResponse.json({ ok: true, data: result }, { status: 201 });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Validation Error');
        }
        if (e.message && e.message.includes('already exists')) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 409, requestId, e.message);
        }
        console.error('[POST /api/cockpit/custom-fields]', e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_create_failed'
        });
    }
}
