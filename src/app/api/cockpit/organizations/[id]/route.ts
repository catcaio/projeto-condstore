import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/infra/auth/guards';
import { errorResponse } from '@/infra/http/error-response';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { organizationService, sanitizeCnpj } from '@/modules/customers/organization.service';

export const revalidate = 0;

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    const requestId = makeRequestId(request);

    const auth = await requireAdmin(request, { requestId });
    if (!auth.ok) return auth.response;
    const tenantId = auth.session.tenantId;

    try {
        const { id: organizationId } = await context.params;
        const body = await request.json();
        const { cnpj, legalName, tradeName } = body;

        if (!cnpj || typeof cnpj !== 'string') {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'CNPJ é obrigatório');
        }

        const cnpjDigits = sanitizeCnpj(cnpj);
        if (!cnpjDigits) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, 'CNPJ inválido (deve conter 14 dígitos)');
        }

        const result = await organizationService.updateOrganizationCnpj({
            tenantId,
            organizationId,
            cnpj,
            legalName,
            tradeName,
            requestId,
        });

        if (!result.ok) {
            return errorResponse('VALIDATION_ERROR' as any, 400, requestId, result.error ?? 'Erro ao atualizar organization');
        }

        return NextResponse.json({
            ok: true,
            merged: result.merged,
            canonicalOrganizationId: result.canonicalOrganizationId,
        });
    } catch (err: any) {
        logger.error('organization_cnpj_update_failed', err as Error, { requestId });
        return errorResponse('INTERNAL_ERROR' as any, 500, requestId, err.message);
    }
}
