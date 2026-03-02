import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/infra/db';
import { tenantDocuments, tenantDocumentVersions } from '@/drizzle/schema';
import { requireKnowledgePermission } from '@/modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '@/infra/http/error-response';
import { eq, desc, sql } from 'drizzle-orm';
import { makeRequestId } from '@/infra/http/request-trace';
import { logger } from '@/infra/logger';

async function _GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:read', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId } = authResult.session;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Number(searchParams.get('limit') || 50), 100);
    const offset = Number(searchParams.get('offset') || 0);

    try {
        const db = await getDb();

        // Simplest query for MVP
        const docs = await db.select({
            id: tenantDocuments.id,
            title: tenantDocuments.title,
            isSensitive: tenantDocuments.isSensitive,
            createdAt: tenantDocuments.createdAt,
            updatedAt: tenantDocuments.updatedAt,
            versionId: tenantDocumentVersions.id,
            status: tenantDocumentVersions.status,
            sizeBytes: tenantDocumentVersions.sizeBytes,
            mimeType: tenantDocumentVersions.mimeType,
        })
            .from(tenantDocuments)
            .leftJoin(tenantDocumentVersions, eq(tenantDocumentVersions.documentId, tenantDocuments.id))
            .where(eq(tenantDocuments.tenantId, tenantId))
            .orderBy(desc(tenantDocuments.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total
        const [{ total }] = await db.select({ total: sql<number>`count(*)` })
            .from(tenantDocuments)
            .where(eq(tenantDocuments.tenantId, tenantId));

        return NextResponse.json({
            data: docs,
            pagination: {
                total: Number(total),
                limit,
                offset,
            }
        });

    } catch (error) {
        logger.error('knowledge_documents_list_error', error as Error, { requestId,
            tenantId,
            error });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Failed to fetch documents');
    }
}

export const GET = withGlobalErrorInterceptor(_GET);
