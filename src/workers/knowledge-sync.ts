import 'dotenv/config';
import { getDb } from '../infra/db';
import { tenantCollections, tenantDocuments, tenantDocumentVersions, tenantIngestionJobs } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { redisClient } from '../infra/redis.client';
import { knowledgeStorage } from '../modules/knowledge/storage';
import { googleDriveConnector } from '../modules/knowledge/connectors/google-drive/connector';
import { planEnforcementService } from '../modules/finops/plan-enforcement.service';
import { logger } from '../infra/logger';
import crypto from 'crypto';

const STREAM_NAME = 'knowledge_sync';
const GROUP_NAME = 'knowledge_sync_group';
const CONSUMER_NAME = `worker-sync-${process.pid}`;
const INGEST_STREAM_NAME = 'knowledge_ingest';

async function setupStream() {
    const redis = redisClient.getRawClient();
    if (!redis) return false;
    try {
        await redis.xgroup('CREATE', STREAM_NAME, GROUP_NAME, '0', 'MKSTREAM');
        logger.info('Knowledge sync Consumer Group created');
    } catch (err: any) {
        if (!err.message.includes('BUSYGROUP')) {
            logger.error('Failed to create Knowledge sync group', err as Error);
            return false;
        }
    }
    return true;
}

async function processSyncAction(collectionId: string, tenantId: string, connectorType: string) {
    logger.info(`Starting Knowledge Sync: ${collectionId} | ${connectorType}`, { tenantId });
    const db = await getDb();

    // 1) Set Syncing
    await db.update(tenantCollections)
        .set({ syncStatus: 'syncing' })
        .where(eq(tenantCollections.id, collectionId));

    try {
        // Obter configuração
        const [collectionData] = await db.select({
            lastSyncAt: tenantCollections.lastSyncAt,
            connectorConfig: tenantCollections.connectorConfig,
        }).from(tenantCollections).where(eq(tenantCollections.id, collectionId));

        if (!collectionData) throw new Error('Collection not found');

        let externalFiles = [];
        const config = (collectionData.connectorConfig as any) || {};

        // 2) Get Changed files based on connector
        if (connectorType === 'google_drive') {
            const token = config.accessToken || 'mock_token';
            externalFiles = await googleDriveConnector.getChangedFiles(tenantId, token, collectionData.lastSyncAt);
        } else {
            throw new Error(`Unsupported connector: ${connectorType}`);
        }

        // 3) Enforce Plan limits via central auth block
        const fileCount = externalFiles.length;
        if (fileCount > 0) {
            const limitResult = await planEnforcementService.incrementAndEnforceSyncLimits(tenantId, fileCount);
            if (!limitResult.allowed) {
                throw new Error(limitResult.reason || 'FinOps limit blocked sync');
            }
        }

        // 4) Download & Write standard ingest workflow
        for (const f of externalFiles) {

            // Generate standard identity structure for Knowledge File
            const sha256 = crypto.createHash('sha256').update(f.modifiedTime + f.id).digest('hex');
            // ^ Pseudo-hash just to prove idempotency change. Normally hash the buffer. We do hash buffer below.

            let dlBuffer: Buffer;
            if (connectorType === 'google_drive') {
                dlBuffer = await googleDriveConnector.downloadFile(tenantId, config.accessToken || '', f.id);
            } else {
                dlBuffer = Buffer.from('');
            }
            const bufferHash = crypto.createHash('sha256').update(dlBuffer).digest('hex');

            // Find or create document
            const existingDocs = await db.select({ id: tenantDocuments.id })
                .from(tenantDocuments)
                .where(and(
                    eq(tenantDocuments.tenantId, tenantId),
                    eq(tenantDocuments.title, f.name),
                    eq(tenantDocuments.collectionId, collectionId)
                ));

            let docId = existingDocs[0]?.id;
            if (!docId) {
                docId = crypto.randomUUID();
                await db.insert(tenantDocuments).values({
                    id: docId,
                    tenantId,
                    title: f.name,
                    createdBy: 'system_sync',
                    collectionId: collectionId,
                    isSensitive: false,
                });
            } else {
                // If it already exists, let's verify if the last version matches hash
                const latestVersion = await db.select({ sha256: tenantDocumentVersions.sha256 })
                    .from(tenantDocumentVersions)
                    .where(eq(tenantDocumentVersions.documentId, docId))
                    .orderBy(desc(tenantDocumentVersions.createdAt)) // Should ideally select highest
                    .limit(1); // just a dirty mock to prevent identical files locally

                if (latestVersion[0]?.sha256 === bufferHash) {
                    continue; // Skip uploading, no change
                }
            }

            // Create new Version
            const versionId = crypto.randomUUID();

            const uploadInit = await knowledgeStorage.createUploadUrl({
                tenantId,
                filename: f.name,
                mimeType: f.mimeType,
                sizeBytes: dlBuffer.length,
                maxSizeBytes: 50 * 1024 * 1024
            });
            await fetch(uploadInit.uploadUrl, { method: 'PUT', body: dlBuffer as any, headers: { 'Content-Type': f.mimeType } });

            await db.insert(tenantDocumentVersions).values({
                id: versionId,
                documentId: docId,
                tenantId: tenantId,
                mimeType: f.mimeType,
                objectKey: uploadInit.objectKey,
                sha256: bufferHash,
                sizeBytes: dlBuffer.length,
                status: 'queued',
            });

            const jobId = crypto.randomUUID();
            await db.insert(tenantIngestionJobs).values({
                id: jobId,
                tenantId: tenantId,
                versionId: versionId,
            });

            // Enqueue on standard Ingest Stream
            const redis = redisClient.getRawClient();
            if (redis) {
                await redis.xadd(INGEST_STREAM_NAME, '*',
                    'tenantId', tenantId,
                    'versionId', versionId,
                    'objectKey', uploadInit.objectKey,
                    'mimeType', f.mimeType
                );
            }
        }

        // 5) Finalize status
        await db.update(tenantCollections)
            .set({
                syncStatus: 'idle',
                lastSyncAt: new Date()
            })
            .where(eq(tenantCollections.id, collectionId));

        logger.info(`Sync complete for ${collectionId}`, { tenantId, processed: externalFiles.length });

    } catch (err: any) {
        logger.error(`Knowledge Sync Failed: ${collectionId}`, err as Error, { tenantId });
        await db.update(tenantCollections)
            .set({ syncStatus: 'error' })
            .where(eq(tenantCollections.id, collectionId));
    }
}

async function runSyncWorker() {
    if (!redisClient.isAvailable()) {
        logger.error('Redis not available. Exiting sync worker.');
        return;
    }
    const redis = redisClient.getRawClient();
    if (!redis) return;

    logger.info(`Starting Knowledge Sync Worker ${CONSUMER_NAME}...`);
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

                    const payload: Record<string, string> = {};
                    for (let i = 0; i < fields.length; i += 2) {
                        payload[fields[i]] = fields[i + 1];
                    }

                    if (payload.tenantId && payload.collectionId && payload.connectorType) {
                        await processSyncAction(payload.collectionId, payload.tenantId, payload.connectorType);
                    }

                    await redis.xack(STREAM_NAME, GROUP_NAME, messageId);
                }
            }
        } catch (error) {
            logger.error('Sync Worker loop error', error as Error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }

    logger.info('Sync Worker stopped safely.');
}

if (require.main === module) {
    runSyncWorker().catch(e => {
        console.error(e);
        process.exit(1);
    });
}
