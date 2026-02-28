import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../infra/db';
import { tenantCollections, tenantDocuments } from '../../../../drizzle/schema';
import { requireKnowledgePermission } from '../../../../modules/knowledge/rbac';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { z } from 'zod';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';
import { eq, desc } from 'drizzle-orm';
import crypto from 'crypto';

const CreateCollectionSchema = z.object({
    name: z.string().min(1).max(255),
    sourceType: z.enum(['manual', 'integration']).default('manual'),
    connectorType: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:read', { requestId });

    if (!authResult.ok) return authResult.response;
    const { tenantId } = authResult.session;

    try {
        const db = await getDb();
        const collections = await db.select()
            .from(tenantCollections)
            .where(eq(tenantCollections.tenantId, tenantId))
            .orderBy(desc(tenantCollections.createdAt));

        return NextResponse.json({ ok: true, data: collections });
    } catch (error) {
        logger.error('Failed to list collections', error as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}

export async function POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    // Manager/Admin needed to CREATE collection + configure syncing if integration
    const authResult = await requireKnowledgePermission(request, 'knowledge:manage', { requestId });

    if (!authResult.ok) return authResult.response;
    const { tenantId } = authResult.session;

    try {
        const body = await request.json();
        const payload = CreateCollectionSchema.parse(body);

        const db = await getDb();
        const id = crypto.randomUUID();

        await db.insert(tenantCollections).values({
            id,
            tenantId,
            name: payload.name,
            sourceType: payload.sourceType,
            connectorType: payload.connectorType || null,
            syncStatus: 'idle',
            autoSync: false,
        });

        const [created] = await db.select().from(tenantCollections).where(eq(tenantCollections.id, id));

        return NextResponse.json({ ok: true, data: created });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid request payload');
        }
        logger.error('Failed to create collection', error as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId);
    }
}
