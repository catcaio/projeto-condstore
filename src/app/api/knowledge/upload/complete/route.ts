import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocumentVersions, tenantIngestionJobs } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';
import { redisClient } from '@/infra/redis.client';

const UploadCompleteSchema = z.object({
    documentId: z.string().uuid(),
    versionId: z.string().uuid(),
    sha256: z.string().length(64),
});

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:upload', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    try {
        const bodyString = await request.text();
        const payload = UploadCompleteSchema.parse(JSON.parse(bodyString));

        const db = await getDb();

        // Find version
        const [version] = await db.select().from(tenantDocumentVersions)
            .where(and(
                eq(tenantDocumentVersions.id, payload.versionId),
                eq(tenantDocumentVersions.tenantId, tenantId),
                eq(tenantDocumentVersions.documentId, payload.documentId)
            ));

        if (!version) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 404, requestId, 'Document version not found');
        }

        if (version.status !== 'uploaded') {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Document already marked as completed');
        }

        // Checking sha256 deductive unique
        const [existingHash] = await db.select().from(tenantDocumentVersions)
            .where(and(
                eq(tenantDocumentVersions.tenantId, tenantId),
                eq(tenantDocumentVersions.sha256, payload.sha256)
            ));

        if (existingHash) {
            // Dedup logic: we could drop this payload and point it back.
            // But for MVP: we reject it as duplicate
            return errorResponse(ErrorCode.VALIDATION_ERROR, 409, requestId, 'Document with this content already exists in your workspace.');
        }

        // Update version status to queued and set its real sha256
        await db.update(tenantDocumentVersions)
            .set({
                status: 'queued',
                sha256: payload.sha256,
            })
            .where(eq(tenantDocumentVersions.id, payload.versionId));

        // Create Job
        const jobId = crypto.randomUUID();
        await db.insert(tenantIngestionJobs).values({
            id: jobId,
            tenantId,
            versionId: payload.versionId,
            status: 'queued',
        });

        // Enqueue to Redis
        if (redisClient.isAvailable()) {
            const redis = redisClient.getRawClient();
            if (redis) {
                await redis.xadd(
                    'knowledge_ingest',
                    '*', // Auto ID
                    'tenantId', tenantId,
                    'versionId', payload.versionId,
                    'objectKey', version.objectKey,
                    'mimeType', version.mimeType
                );
            }
        }

        logger.info('knowledge_upload_complete', {
            requestId,
            tenantId,
            versionId: payload.versionId,
            sha256: payload.sha256,
            jobId,
        });

        return NextResponse.json({ success: true, status: 'queued', jobId });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid request payload');
        }

        logger.error('knowledge_upload_complete_error', error as Error, { requestId,
            tenantId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to complete upload');
    }
}
