import { withGlobalErrorInterceptor } from '@/infra/http/with-global-error-interceptor';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../infra/db';
import { tenantKnowledgeQueries } from '../../../../drizzle/schema';
import { requireKnowledgePermission } from '../../../../modules/knowledge/rbac';
import { retrievalService } from '../../../../modules/knowledge/retrieval.service';
import { buildGroundedAnswer } from '../../../../modules/knowledge/answer-builder';
import { ErrorCode, errorResponse } from '../../../../infra/http/error-response';
import { z } from 'zod';
import { makeRequestId } from '../../../../infra/http/request-trace';
import { logger } from '../../../../infra/logger';
import crypto from 'crypto';

const AskQuerySchema = z.object({
    question: z.string().min(1).max(2000),
    topK: z.number().min(1).max(15).optional().default(5),
    includeSensitive: z.boolean().optional().default(false),
});

async function _POST(request: NextRequest) {
    const requestId = makeRequestId(request);
    const authResult = await requireKnowledgePermission(request, 'knowledge:ask', { requestId });

    if (!authResult.ok) {
        return authResult.response;
    }

    const { tenantId, sub } = authResult.session;
    const role = authResult.session.role;

    try {
        const body = await request.json();
        const payload = AskQuerySchema.parse(body);

        // Security override: Only Manager/Admin can search sensitive queries
        let canSearchSensitive = payload.includeSensitive;
        if (canSearchSensitive && role !== 'admin' && role !== 'manager') {
            logger.warn('Role attempted sensitive chunk access without privilege', { tenantId, role });
            canSearchSensitive = false;
        }

        // Retrieve chunks
        const retrievalOutput = await retrievalService.retrieveRelevantChunks({
            tenantId,
            query: payload.question,
            topK: payload.topK,
            includeSensitive: canSearchSensitive,
        });

        // Answer Builder (inclui sanitize LLM / injection guard)
        const builderOutput = await buildGroundedAnswer({
            question: payload.question,
            retrievedChunks: retrievalOutput.chunks,
            confidence: retrievalOutput.confidence,
        });

        const citations = retrievalOutput.chunks.map((c: any) => ({
            docId: c.docId,
            versionId: c.versionId,
            chunkId: c.id,
            title: c.documentTitle,
            orderIndex: c.orderIndex,
            charStart: c.charStart,
            charEnd: c.charEnd,
            isSensitive: c.isSensitive,
        }));

        // Audit & Trace Save
        const questionHash = crypto.createHash('sha256').update(payload.question).digest('hex');
        const questionPreview = canSearchSensitive ?
            '[REDACTED AS SENSITIVE]' :
            payload.question.substring(0, 190);

        const db = await getDb();
        await db.insert(tenantKnowledgeQueries).values({
            id: crypto.randomUUID(),
            tenantId,
            userId: sub,
            questionHash,
            questionPreview,
            confidence: builderOutput.confidence.toString(),
            citationsJson: citations,
            requestId,
        });

        logger.info('Knowledge Ask Computed', {
            requestId,
            tenantId,
            queryHash: questionHash,
            confidence: builderOutput.confidence,
            chunksFound: citations.length,
            sensitiveToggle: canSearchSensitive
        });

        return NextResponse.json({
            ok: true,
            answer: builderOutput.answer,
            confidence: builderOutput.confidence,
            citations,
        });

    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return errorResponse(ErrorCode.VALIDATION_ERROR, 400, requestId, 'Invalid request payload');
        }
        logger.error('Knowledge Ask API failed', error as Error, { tenantId, requestId });
        return errorResponse("INTERNAL_ERROR" as any, 500, requestId, 'Ocorreu um erro interno de inferência');
    }
}

export const POST = withGlobalErrorInterceptor(_POST);
