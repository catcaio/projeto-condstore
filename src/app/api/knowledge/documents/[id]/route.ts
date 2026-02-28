import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocuments, tenantDocumentVersions } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { eq, and } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = await params;
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:read', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    try {
        const db = await getDb();

        const [doc] = await db.select({
            id: tenantDocuments.id,
            title: tenantDocuments.title,
            isSensitive: tenantDocuments.isSensitive,
            createdAt: tenantDocuments.createdAt,
            updatedAt: tenantDocuments.updatedAt,
        }).from(tenantDocuments)
            .where(and(
                eq(tenantDocuments.id, documentId),
                eq(tenantDocuments.tenantId, tenantId)
            ));

        if (!doc) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Document not found');
        }

        const versions = await db.select({
            id: tenantDocumentVersions.id,
            documentId: tenantDocumentVersions.documentId,
            mimeType: tenantDocumentVersions.mimeType,
            sizeBytes: tenantDocumentVersions.sizeBytes,
            sha256: tenantDocumentVersions.sha256,
            status: tenantDocumentVersions.status,
            errorCode: tenantDocumentVersions.errorCode,
            extractedTextPreview: tenantDocumentVersions.extractedTextPreview,
            extractedMetaJson: tenantDocumentVersions.extractedMetaJson,
            createdAt: tenantDocumentVersions.createdAt,
        }).from(tenantDocumentVersions)
            .where(and(
                eq(tenantDocumentVersions.documentId, documentId),
                eq(tenantDocumentVersions.tenantId, tenantId)
            ));

        return NextResponse.json({
            ...doc,
            versions,
        });

    } catch (error) {
        logger.error('knowledge_document_get_error', error as Error, { requestId,
            tenantId,
            documentId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to fetch document details');
    }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = await params;
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:delete', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    try {
        const db = await getDb();

        // Purge document and versions (in a real system, you'd also delete from S3 or use object lifecycle hooks)
        const [doc] = await db.select({ id: tenantDocuments.id })
            .from(tenantDocuments)
            .where(and(
                eq(tenantDocuments.id, documentId),
                eq(tenantDocuments.tenantId, tenantId)
            ));

        if (!doc) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Document not found');
        }

        await db.delete(tenantDocumentVersions).where(and(
            eq(tenantDocumentVersions.documentId, documentId),
            eq(tenantDocumentVersions.tenantId, tenantId)
        ));

        await db.delete(tenantDocuments).where(and(
            eq(tenantDocuments.id, documentId),
            eq(tenantDocuments.tenantId, tenantId)
        ));

        logger.info('knowledge_document_deleted', {
            requestId,
            tenantId,
            documentId,
        });

        return NextResponse.json({ success: true, message: 'Document deleted successfully' });

    } catch (error) {
        logger.error('knowledge_document_delete_error', error as Error, { requestId,
            tenantId,
            documentId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to delete document');
    }
}
