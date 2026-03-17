import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocuments, tenantDocumentVersions } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { knowledgeStorage } from '@/modules/knowledge/storage';
import { planEnforcementService } from '@/modules/finops';
import { eq, and, sql } from 'drizzle-orm';
import { z } from 'zod';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

const UploadInitSchema = z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().positive(),
    collectionId: z.string().uuid().optional(),
    isSensitive: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:upload', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId, sub } = authResult.session;

    try {
        const bodyString = await request.text();
        const payload = UploadInitSchema.parse(JSON.parse(bodyString));

        // FinOps Enforcement
        const planData = await planEnforcementService.getPlanStatus(tenantId);

        if (payload.sizeBytes > planData.limits.knowledge_max_file_size_bytes) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 402, requestId, `File size exceeds plan limit of ${planData.limits.knowledge_max_file_size_bytes} bytes`, {
                code: 'PAYMENT_REQUIRED',
                limit: planData.limits.knowledge_max_file_size_bytes
            });
        }

        // Get current usage from DB (knowledge_files this month & total storage)
        const db = await getDb();

        // Check total storage
        const [{ totalBytes }] = await db.select({
            totalBytes: sql<number>`COALESCE(SUM(size_bytes), 0)`
        }).from(tenantDocumentVersions)
            .where(eq(tenantDocumentVersions.tenantId, tenantId));

        if (Number(totalBytes) + payload.sizeBytes > planData.limits.knowledge_max_storage_total_bytes) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 402, requestId, `Total storage exceeds plan limit`, {
                code: 'PAYMENT_REQUIRED'
            });
        }

        // Check count for this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [{ monthCount }] = await db.select({
            monthCount: sql<number>`count(*)`
        }).from(tenantDocumentVersions)
            .where(and(
                eq(tenantDocumentVersions.tenantId, tenantId),
                sql`${tenantDocumentVersions.createdAt} >= ${startOfMonth}`
            ));

        if (Number(monthCount) >= planData.limits.knowledge_max_files_per_month) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 402, requestId, `Monthly file upload count exceeded`, {
                code: 'PAYMENT_REQUIRED'
            });
        }

        // Create Presigned URL
        const { uploadUrl, objectKey } = await knowledgeStorage.createUploadUrl({
            tenantId,
            filename: payload.filename,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            maxSizeBytes: planData.limits.knowledge_max_file_size_bytes
        });

        const docId = crypto.randomUUID();
        const versionId = crypto.randomUUID();

        // Insert Document + Version
        await db.insert(tenantDocuments).values({
            id: docId,
            tenantId,
            title: payload.filename,
            createdBy: sub,
            collectionId: payload.collectionId || null,
            isSensitive: payload.isSensitive,
        });

        await db.insert(tenantDocumentVersions).values({
            id: versionId,
            documentId: docId,
            tenantId,
            objectKey,
            mimeType: payload.mimeType,
            sizeBytes: payload.sizeBytes,
            sha256: 'pending-' + versionId, // Temporary hash until complete
            status: 'uploaded',
        });

        logger.info('knowledge_upload_init', {
            requestId,
            tenantId,
            documentId: docId,
            versionId,
            sizeBytes: payload.sizeBytes,
        });

        return NextResponse.json({
            uploadUrl,
            documentId: docId,
            versionId,
            objectKey
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid request payload');
        }

        logger.error('knowledge_upload_init_error', error as Error, { requestId,
            tenantId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to initialize upload');
    }
}
