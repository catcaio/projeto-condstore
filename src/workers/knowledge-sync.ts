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

import { subscribeEvent } from '../domine/event-bus';
import { DomineEvent } from '../domine/events/types';

const INGEST_STREAM_NAME = 'knowledge_ingest';



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
                    ; // just a dirty mock to prevent identical files locally

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

export function startKnowledgeSyncWorker() {
    logger.info('Starting Knowledge Sync Worker on Domine Event...');

    subscribeEvent('KNOWLEDGE_SYNC_REQUESTED', async (event: DomineEvent) => {
        const payload = event.payload as any;
        const tenantId = payload.tenantId || event.tenantId;
        const { collectionId, connectorType } = payload;

        try {
            if (tenantId && collectionId && connectorType) {
                await processSyncAction(collectionId, tenantId, connectorType);
                logger.info('knowledge_sync_processed', { eventId: event.id, tenantId, collectionId });
            } else {
                logger.warn('knowledge_sync_ignored_missing_data', { eventId: event.id, payload });
            }
        } catch (error) {
            logger.error('knowledge_sync_failed', error as Error, { eventId: event.id, tenantId, collectionId });
            // For now, no implicit DLQ in Domine Event Bus in-memory. Just logged as failed.
        }
    });
}

if (require.main === module) {
    if (!redisClient.isAvailable()) {
        logger.error('Redis not available. Exiting sync worker.');
        process.exit(1);
    }
    startKnowledgeSyncWorker();
}
