import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../../../infra/db';
import { tenantCollections } from '../../../../../../drizzle/schema';
import { requireKnowledgePermission } from '../../../../../../modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '../../../../../../infra/http/error-response';
import { eq, and } from 'drizzle-orm';
import { makeRequestId } from '../../../../../../infra/http/request-trace';
import { logger } from '../../../../../../infra/logger';
import { redisClient } from '../../../../../../infra/redis.client';

async function _POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const requestId = makeRequestId(request);

    // Manage is needed to trigger integrations
    const authResult = await requireKnowledgePermission(request, 'knowledge:manage', { requestId });
    if (!authResult.ok) return authResult.response;

    const { tenantId } = authResult.session;
    const { id } = params;

    try {
        const db = await getDb();
        const [collection] = await db.select()
            .from(tenantCollections)
            .where(and(eq(tenantCollections.id, id), eq(tenantCollections.tenantId, tenantId)));

        if (!collection) {
            return errorResponse("NOT_FOUND" as any, 404, requestId, 'Coleção não encontrada');
        }

        if (collection.sourceType !== 'integration' || !collection.connectorType) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Apenas coleções do tipo integração podem ser sincronizadas via stream');
        }

        if (collection.syncStatus === 'syncing') {
            return errorResponse("CONFLICT" as any, 409, requestId, 'Uma sincronização já está em andamento');
        }

        // Push to redis stream
        const redis = redisClient.getRawClient();
        if (!redis) {
            return errorResponse("INTERNAL_ERROR" as any, 503, requestId, 'Serviço de filas offline');
        }

        await redis.xadd('knowledge_sync', '*',
            'tenantId', tenantId,
            'collectionId', id,
            'connectorType', collection.connectorType
        );

        logger.info('Knowledge sync enqueued', { tenantId, collectionId: id, connector: collection.connectorType });

        return NextResponse.json({ ok: true, message: 'Sync manual enfileirado com sucesso' });

    } catch (error) {
        logger.error('Failed to trigger collection sync', error as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
