import 'dotenv/config';
import { getDb } from '../infra/db';
import { tenantDocumentVersions, tenantIngestionJobs, tenantDocumentChunks } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { redisClient } from '../infra/redis.client';
import { knowledgeStorage } from '../modules/knowledge/storage';
import { chunkDocument } from '../modules/knowledge/chunker';
import { getEmbeddingsService } from '../modules/knowledge/embeddings.service';
import { logger } from '../infra/logger';

const STREAM_NAME = 'knowledge_ingest';
const GROUP_NAME = 'knowledge_ingest_group';
const CONSUMER_NAME = `worker-${process.pid}`;

async function setupStream() {
    const redis = redisClient.getRawClient();
    if (!redis) return false;
    try {
        await redis.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
        logger.info('Knowledge ingest Consumer Group created');
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            logger.error('Failed to create Knowledge ingest group', err as Error);
            return false;
        }
    }
    return true;
}

async function extractTextFromFileBuffer(buffer: Buffer, mimeType: string): Promise<{ text: string, meta: any }> {
    // Highly naive extraction for MVP, as requested.
    const PREVIEW_LIMIT = 5000;

    if (mimeType === 'text/plain' || mimeType === 'text/markdown') {
        const text = buffer.toString('utf-8');
        return { text, meta: { size: buffer.length } };
    }

    if (mimeType === 'text/csv') {
        const text = buffer.toString('utf-8');
        const lines = text.split('\n');
        return { text, meta: { totalLines: lines.length } };
    }

    if (mimeType === 'application/pdf') {
        // Without an OCR/PDF lib, just extract ASCII text block
        const text = buffer.toString('utf-8').replace(/[^\x20-\x7E\n]/g, '');
        return { text, meta: { maybePdf: true } };
    }

    return { text: '', meta: { unsupported: true, originalMime: mimeType } };
}

async function processMessage(messageId: string, fields: string[]) {
    // fields: ['tenantId', 'val', 'versionId', 'val', 'objectKey', 'val', 'mimeType', 'val']
    const payload: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
        payload[fields[i]] = fields[i + 1];
    }

    const { tenantId, versionId, objectKey, mimeType, force } = payload;
    logger.info('Knowledge ingest processing started', { versionId, tenantId });

    const db = await getDb();

    try {
        // 1. Mark as processing
        await db.update(tenantDocumentVersions)
            .set({ status: 'processing', errorCode: null })
            .where(and(eq(tenantDocumentVersions.id, versionId), eq(tenantDocumentVersions.tenantId, tenantId)));

        // Find latest job for this version
        const [job] = await db.select().from(tenantIngestionJobs)
            .where(eq(tenantIngestionJobs.versionId, versionId))
            .limit(1); // naive latest for this worker logic

        if (job) {
            await db.update(tenantIngestionJobs)
                .set({ status: 'processing', attempts: job.attempts + 1 })
                .where(eq(tenantIngestionJobs.id, job.id));
        }

        // 2. Fetch from Object Storage
        const downloadUrl = await knowledgeStorage.createDownloadUrl({ tenantId, objectKey });
        const resp = await fetch(downloadUrl);
        if (!resp.ok) {
            throw new Error(`Storage fetch failed: ${resp.status} ${resp.statusText}`);
        }

        const arrayBuffer = await resp.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // 3. Extract text preview
        const { text, meta } = await extractTextFromFileBuffer(buffer, mimeType);
        const previewText = text.substring(0, 5000); // 5k limit just for preview

        // 4. Chunk Document
        const chunks = chunkDocument({ text, mimeType });

        // 5. Save Chunks
        if (chunks.length > 0) {
            await db.insert(tenantDocumentChunks).values(
                chunks.map(c => ({
                    id: crypto.randomUUID(),
                    tenantId,
                    versionId,
                    content: c.content,
                    orderIndex: c.orderIndex,
                    charStart: c.charStart || 0,
                    charEnd: c.charEnd || 0,
                    pageNumber: null, // unsupported natively without PDF.js
                }))
            );

            // 6. Generate Embeddings using service
            await getEmbeddingsService().generateAndStoreEmbeddings(versionId, tenantId);
        }

        // 7. Update status to ready_indexed
        await db.update(tenantDocumentVersions)
            .set({
                status: 'ready_indexed',
                extractedTextPreview: previewText,
                extractedMetaJson: meta
            })
            .where(eq(tenantDocumentVersions.id, versionId));

        if (job) {
            await db.update(tenantIngestionJobs)
                .set({ status: 'completed' })
                .where(eq(tenantIngestionJobs.id, job.id));
        }

        logger.info('Knowledge ingest processing complete', { versionId, tenantId });

    } catch (error: any) {
        logger.error('Knowledge ingest processing failed', error, { versionId, tenantId });

        await db.update(tenantDocumentVersions)
            .set({ status: 'failed', errorCode: error.message?.slice(0, 128) || 'unknown_error' })
            .where(eq(tenantDocumentVersions.id, versionId));

        await db.update(tenantIngestionJobs)
            .set({ status: 'failed' })
            .where(eq(tenantIngestionJobs.versionId, versionId)); // update all naive matches
    }
}

async function runWorker() {
    if (!redisClient.isAvailable()) {
        logger.error('Redis not available. Exiting worker.');
        return;
    }
    const redis = redisClient.getRawClient();
    if (!redis) return;

    logger.info(`Starting Knowledge Ingest Worker ${CONSUMER_NAME}...`);
    await setupStream();

    let running = true;
    process.on('SIGTERM', () => { running = false; });
    process.on('SIGINT', () => { running = false; });

    while (running) {
        try {
            const results = await redis.xreadgroup(
                'GROUP', GROUP_NAME, CONSUMER_NAME,
                'COUNT', 1,
                'BLOCK', 5000,
                'STREAMS', STREAM_NAME, '>'
            ) as any;

            if (results && results.length > 0) {
                const stream = results[0];
                const messages = stream[1];

                for (const message of messages) {
                    const [messageId, fields] = message;
                    await processMessage(messageId, fields);
                    await redis.xack(STREAM_NAME, GROUP_NAME, messageId);
                }
            }
        } catch (error) {
            logger.error('Worker loop error', error as Error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    logger.info('Worker stopped safely.');
}

if (require.main === module) {
    runWorker().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
