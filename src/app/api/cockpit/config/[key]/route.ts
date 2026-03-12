import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse, ErrorCode } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { configService } from '@/modules/config/config.service';

export async function GET(req: NextRequest, props: { params: Promise<{ key: string }> }) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;
        const tenantId = auth.session.tenantId;

        const { key } = await props.params;

        const config = await configService.getConfig(tenantId, key);

        if (!config) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Not Found');
        }

        return NextResponse.json({ ok: true, data: config });
    } catch (e) {
        console.error(`[GET /api/cockpit/config/[key]]`, e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'config_fetch_failed'
        });
    }
}

export async function DELETE(req: NextRequest, props: { params: Promise<{ key: string }> }) {
    let requestId = 'unknown';
    try {
        requestId = makeRequestId(req);
        const auth = await requireAdmin(req, { requestId });
        if (!auth.ok) return auth.response;
        const tenantId = auth.session.tenantId;
        const sub = auth.session.sub;

        const { key } = await props.params;

        const { searchParams } = new URL(req.url);
        const category = searchParams.get('category');

        if (!category) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Category query parameter is required for deletion');
        }

        const success = await configService.deleteConfig(tenantId, key, category as any, sub);

        if (!success) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Not Found or Already Deleted');
        }

        return NextResponse.json({ ok: true, data: { deleted: true } });
    } catch (e) {
        console.error(`[DELETE /api/cockpit/config/[key]]`, e);
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, 'Internal Server Error', {
            systemEventId: 'config_delete_failed'
        });
    }
}
