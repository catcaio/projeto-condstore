import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin, requireSession } from '@/infra/auth/guards';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { getEcommerceCockpit, ecommerceRepository } from '@/modules/cockpit/gestao-ecommerce/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const filtersSchema = z.object({
    frontCode: z.enum(['F01', 'F02', 'F03', 'F04', 'F05', 'F06']).optional(),
    projectId: z.string().min(1).max(36).regex(/^[a-zA-Z0-9_-]+$/).optional(),
}).strict();
const externalIdSchema = z.string().min(1).max(36).regex(/^\d+$/);
const setupSchema = z.discriminatedUnion('action', [
    z.object({ action: z.literal('seed_demo') }).strict(),
    z.object({
        action: z.literal('configure'), operationName: z.string().trim().min(1).max(255),
        workspace: z.object({
            id: externalIdSchema, name: z.string().trim().min(1).max(255),
        }).strict(),
    }).strict(),
]);
const privateHeaders = { 'Cache-Control': 'private, no-store', Vary: 'Cookie' };

export async function GET(request: NextRequest) {
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const params = request.nextUrl.searchParams;
    if (Array.from(params.keys()).some((key) => params.getAll(key).length !== 1)) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, auth.requestId, 'Filtros inválidos');
    }
    const parsed = filtersSchema.safeParse(Object.fromEntries(params));
    if (!parsed.success) return errorResponse(ErrorCode.VALIDATION_ERROR, 400, auth.requestId, 'Filtros inválidos');
    try {
        const snapshot = await getEcommerceCockpit({ tenantId: auth.session.tenantId, userId: auth.session.sub, role: auth.session.role }, parsed.data);
        return NextResponse.json(snapshot, { headers: privateHeaders });
    } catch {
        return errorResponse(ErrorCode.UNKNOWN, 503, auth.requestId, 'Não foi possível carregar os registros. Tente novamente.');
    }
}

export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (!auth.ok) return auth.response;
    if (request.nextUrl.searchParams.size > 0) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, auth.requestId, 'Parâmetros não permitidos');
    }
    // Session cookies authenticate this administrative write; a same-origin browser request is required.
    if (request.headers.get('origin') !== request.nextUrl.origin) {
        return errorResponse(ErrorCode.FORBIDDEN, 403, auth.requestId, 'Origem não autorizada');
    }
    if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 415, auth.requestId, 'Envie um documento JSON');
    }
    let body: unknown;
    try { body = await request.json(); } catch {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, auth.requestId, 'Documento JSON inválido');
    }
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, auth.requestId, 'Configuração inválida');
    }
    try {
        const actor = { tenantId: auth.session.tenantId, userId: auth.session.sub, role: auth.session.role };
        if (parsed.data.action === 'configure') {
            const { operationName, workspace } = parsed.data;
            await ecommerceRepository.configure(actor, { operationName, workspace });
            return NextResponse.json({ configured: true, syncStatus: 'awaiting_verification' }, { headers: privateHeaders });
        }
        const result = await ecommerceRepository.seedDemonstration(actor);
        return NextResponse.json({ ...result, isDemo: true }, { headers: privateHeaders });
    } catch {
        return errorResponse(ErrorCode.UNKNOWN, 503, auth.requestId, 'Não foi possível preparar a demonstração. Tente novamente.');
    }
}
