import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocuments } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

const MarkSensitiveSchema = z.object({
    isSensitive: z.boolean(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = await params;
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:mark_sensitive', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    try {
        const bodyString = await request.text();
        const payload = MarkSensitiveSchema.parse(JSON.parse(bodyString));

        const db = await getDb();

        const [doc] = await db.select({ id: tenantDocuments.id })
            .from(tenantDocuments)
            .where(and(
                eq(tenantDocuments.id, documentId),
                eq(tenantDocuments.tenantId, tenantId)
            ));

        if (!doc) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Document not found');
        }

        await db.update(tenantDocuments)
            .set({ isSensitive: payload.isSensitive })
            .where(and(
                eq(tenantDocuments.id, documentId),
                eq(tenantDocuments.tenantId, tenantId)
            ));

        logger.info('knowledge_document_sensitive_marked', {
            requestId,
            tenantId,
            documentId,
            isSensitive: payload.isSensitive,
        });

        return NextResponse.json({ success: true, isSensitive: payload.isSensitive });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid request payload');
        }

        logger.error('knowledge_document_sensitive_error', error as Error, { requestId,
            tenantId,
            documentId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to update document metadata');
    }
}
