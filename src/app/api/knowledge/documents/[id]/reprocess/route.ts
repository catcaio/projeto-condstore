import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocuments, tenantDocumentVersions, tenantIngestionJobs } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { eq, and, desc } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { redisClient } from '@/infra/redis.client';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: documentId } = await params;
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:reprocess', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    try {
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

        // Find the latest version
        const [latestVersion] = await db.select()
            .from(tenantDocumentVersions)
            .where(and(
                eq(tenantDocumentVersions.documentId, documentId),
                eq(tenantDocumentVersions.tenantId, tenantId)
            ))
            .orderBy(desc(tenantDocumentVersions.createdAt))
            .limit(1);

        if (!latestVersion) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'No version found for document');
        }

        // Set to queued
        await db.update(tenantDocumentVersions)
            .set({ status: 'queued', errorCode: null })
            .where(eq(tenantDocumentVersions.id, latestVersion.id));

        // Create Job
        const jobId = crypto.randomUUID();
        await db.insert(tenantIngestionJobs).values({
            id: jobId,
            tenantId,
            versionId: latestVersion.id,
            status: 'queued',
        });

        if (redisClient.isAvailable()) {
            const redis = redisClient.getRawClient();
            if (redis) {
                await redis.xadd(
                    'knowledge_ingest',
                    '*', // Auto ID
                    'tenantId', tenantId,
                    'versionId', latestVersion.id,
                    'objectKey', latestVersion.objectKey,
                    'mimeType', latestVersion.mimeType,
                    'force', 'true' // Flag to bypass sha256 deductive idempotency if needed
                );
            }
        }

        logger.info('knowledge_document_reprocess_queued', {
            requestId,
            tenantId,
            documentId,
            versionId: latestVersion.id,
            jobId,
        });

        return NextResponse.json({ success: true, status: 'queued', jobId });

    } catch (error) {
        logger.error('knowledge_document_reprocess_error', error as Error, { requestId,
            tenantId,
            documentId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to queue document for reprocessing');
    }
}
