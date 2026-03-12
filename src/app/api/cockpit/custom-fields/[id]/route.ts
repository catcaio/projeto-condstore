import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { customFieldsService } from '@/modules/custom-fields/custom-fields.service';
import { updateCustomFieldSchema } from '@/modules/custom-fields/custom-fields.types';
import { z } from 'zod';

export async function PUT(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const tenantId = auth.session.tenantId;
        const sub = auth.session.sub;

        const { id } = await props.params;

        const rawBody = await req.json();
        const payload = updateCustomFieldSchema.parse(rawBody);

        const updated = await customFieldsService.updateField(tenantId, id, payload, sub);

        return NextResponse.json({ ok: true, data: updated });
    } catch (e: any) {
        if (e instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Validation Error');
        }
        if (e.message && e.message.includes('not found')) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, e.message);
        }
        console.error(`[PUT /api/cockpit/custom-fields/[id]]`, e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_update_failed'
        });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ id: string }> }) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;

        const tenantId = auth.session.tenantId;
        const sub = auth.session.sub;

        const { id } = await props.params;

        const success = await customFieldsService.deleteField(tenantId, id, sub);

        if (!success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Not Found or Already Deleted');
        }

        return NextResponse.json({ ok: true, data: { deleted: true } });
    } catch (e) {
        console.error(`[DELETE /api/cockpit/custom-fields/[id]]`, e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'custom_fields_delete_failed'
        });
    }
}
