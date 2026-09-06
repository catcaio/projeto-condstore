import { NextRequest, NextResponse } from 'next/server';
import { extractTenantIdFromTenantRoute, requireSessionTenantMatch } from '@/infra/auth/tenant-route-guard';
import { domineEventsRepository } from '@/infra/repositories/domine-events.repository';
import { makeRequestId } from '@/infra/http/request-trace';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';

/**
 * PII-safe redaction: strips fields that could contain sensitive data
 * from payloadJson before sending to the client.
 */
function redactPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== 'object') return {};

    const PII_FIELDS = new Set([
        'email', 'telefone', 'phone', 'cpf', 'cnpj', 'rg',
        'password', 'senha', 'token', 'secret', 'authorization',
        'creditCard', 'cardNumber', 'cvv', 'ssn',
    ]);

    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
        if (PII_FIELDS.has(key.toLowerCase())) {
            redacted[key] = '[REDACTED]';
        } else {
            redacted[key] = value;
        }
    }
    return redacted;
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ tenantId: string; id: string }> },
) {
    const requestId = makeRequestId(req);
    const tenantIdFromRoute = extractTenantIdFromTenantRoute(req);

    const guard = await requireSessionTenantMatch(req, tenantIdFromRoute);
    if (!guard.ok) return guard.response;

    if (guard.sessionUser.role !== 'admin') {
        return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
    }

    const { id } = await params;

    if (!id || id.trim().length === 0) {
        return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Event ID is required');
    }

    try {
        const event = await domineEventsRepository.getById(guard.tenantId, id);

        if (!event) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Event not found');
        }

        // Verify the event belongs to the requesting tenant (defense-in-depth;
        // the repository already scopes by tenantId).
        if (event.tenantId !== guard.tenantId) {
            return errorResponse(ErrorCode.FORBIDDEN, 403, requestId, 'Forbidden');
        }

        return NextResponse.json({
            data: {
                id: event.id,
                tenantId: event.tenantId,
                source: event.source,
                type: event.type,
                status: event.status,
                idempotencyKey: event.idempotencyKey,
                payload: redactPayload(event.payloadJson),
                errorCode: event.errorCode ?? null,
                errorMessage: event.errorMessage ?? null,
                createdAt: event.createdAt,
                processedAt: event.processedAt ?? null,
            },
        });
    } catch (e: any) {
        return errorResponse(ErrorCode.UNKNOWN, 500, requestId, e.message);
    }
}
