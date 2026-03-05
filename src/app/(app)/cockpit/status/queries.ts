import { getDb } from '../../../../infra/db';
import { tenantDocuments, tenantDocumentVersions, tenantKnowledgeQueries, messages, webhookEvents, tenantCollections } from '../../../../drizzle/schema';
import { eq, count, and, desc, sql } from 'drizzle-orm';
import { redisClient } from '../../../../infra/redis.client';
import { planEnforcementService } from '../../../../modules/finops/plan-enforcement.service';
import { knowledgeStorage } from '../../../../modules/knowledge/storage';
import { logger } from '../../../../infra/logger';

export interface SystemStatusPayload {
    finops: { state: string; percentUsed: number; limitsSummary: string };
    ai: { providerEnabled: boolean; vectorNativeEnabled: boolean; lastEmbeddingAt: string | null; lastAskAt: string | null };
    knowledge: { docsTotal: number; readyIndexedTotal: number; failedTotal: number; ingestQueueDepth: number | string; syncQueueDepth: number | string; lastSyncAt: string | null };
    whatsapp: { twilioConfigured: boolean; lastInboundAt: string | null; lastOutboundAt: string | null; outboundBlockedByFinops: boolean };
    infra: { redis: 'ok' | 'degraded' | 'down'; db: 'ok' | 'degraded' | 'down'; storage: 'ok' | 'degraded' | 'down', storageReason?: string };
    lastUpdatedAt: string;
    [key: string]: any; // Allow storageReason extension organically
}

export async function getSystemStatus(tenantId: string, role: string): Promise<SystemStatusPayload> {
    const db = await getDb();

    // Auth filtering based on role happens either here or in the router.
    // The payload is structured. If 'viewer' or 'agent', maybe censor secrets, but here we don't have secrets.
    const isAtLeastManager = ['admin', 'owner', 'manager'].includes(role);

    // 1. FinOps
    const finopsData = await planEnforcementService.getPlanStatus(tenantId);

    // 2. IA
    const aiProviderEnabled = true; // MVP assumption or fetch from tenant_ai_providers
    const vectorNativeEnabled = process.env.ENABLE_VECTOR_NATIVE === 'true';

    const [lastAsk] = await db.select({ date: tenantKnowledgeQueries.createdAt })
        .from(tenantKnowledgeQueries)
        .where(eq(tenantKnowledgeQueries.tenantId, tenantId))
        .orderBy(desc(tenantKnowledgeQueries.createdAt))
        ;

    const [lastEmbed] = await db.select({ date: tenantDocumentVersions.createdAt })
        .from(tenantDocumentVersions)
        .where(and(eq(tenantDocumentVersions.tenantId, tenantId), eq(tenantDocumentVersions.status, 'ready_indexed')))
        .orderBy(desc(tenantDocumentVersions.createdAt))
        ;

    // 3. Knowledge
    const [{ docsTotal }] = await db.select({ docsTotal: count() })
        .from(tenantDocuments)
        .where(eq(tenantDocuments.tenantId, tenantId));

    const [{ readyTotal }] = await db.select({ readyTotal: count() })
        .from(tenantDocumentVersions)
        .where(and(eq(tenantDocumentVersions.tenantId, tenantId), eq(tenantDocumentVersions.status, 'ready_indexed')));

    const [{ failedTotal }] = await db.select({ failedTotal: count() })
        .from(tenantDocumentVersions)
        .where(and(eq(tenantDocumentVersions.tenantId, tenantId), eq(tenantDocumentVersions.status, 'failed')));

    const [lastSync] = await db.select({ date: tenantCollections.lastSyncAt })
        .from(tenantCollections)
        .where(eq(tenantCollections.tenantId, tenantId))
        .orderBy(desc(tenantCollections.lastSyncAt))
        ;

    // Redis stream queue depth (best effort)
    let ingestQueueDepth: number | string = 'unknown';
    let syncQueueDepth: number | string = 'unknown';

    const redis = redisClient.getRawClient();
    if (redisClient.isAvailable() && redis) {
        try {
            ingestQueueDepth = await redis.xlen('knowledge_ingest');
            syncQueueDepth = await redis.xlen('knowledge_sync');
        } catch (e) {
            ingestQueueDepth = 'error';
            syncQueueDepth = 'error';
        }
    }

    // 4. WhatsApp
    const twilioConfigured = true; // Mock assumption for MVP

    const [lastInbound] = await db.select({ date: messages.createdAt })
        .from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'inbound' as any)))
        .orderBy(desc(messages.createdAt))
        
        .catch(() => [{ date: null }]);

    const [lastOutbound] = await db.select({ date: messages.createdAt })
        .from(messages)
        .where(and(eq(messages.tenantId, tenantId), eq(messages.direction, 'outbound' as any)))
        .orderBy(desc(messages.createdAt))
        
        .catch(() => [{ date: null }]);

    const outboundBlockedByFinops = finopsData.state === 'locked' || finopsData.state === 'degraded';

    // 5. Infra Health Checks
    let redisHealth: 'ok' | 'degraded' | 'down' = 'down';
    if (redisClient.isAvailable() && redis) {
        try {
            const pong = await redis.ping();
            redisHealth = pong === 'PONG' ? 'ok' : 'degraded';
        } catch (e) {
            redisHealth = 'down';
        }
    }

    let dbHealth: 'ok' | 'degraded' | 'down' = 'down';
    try {
        await db.execute(sql`SELECT 1`);
        dbHealth = 'ok';
    } catch (e) {
        dbHealth = 'down';
    }

    let storageHealth: 'ok' | 'degraded' | 'down' = 'ok';
    let storageReason = '';
    try {
        // Fast NOOP generation to check S3 client conf
        await knowledgeStorage.createUploadUrl({
            tenantId: 'health_check',
            filename: 'probe.txt',
            mimeType: 'text/plain',
            sizeBytes: 10,
            maxSizeBytes: 100
        });
    } catch (e: any) {
        storageHealth = 'degraded';
        storageReason = e.message;
    }

    const payload: SystemStatusPayload = {
        finops: {
            state: finopsData.state,
            percentUsed: Number(finopsData.maxPercent),
            limitsSummary: `WPP: ${finopsData.usage.whatsapp_outbound_per_month}/${finopsData.limits.whatsapp_outbound_per_month} | FRT: ${finopsData.usage.freight_simulations_per_month}/${finopsData.limits.freight_simulations_per_month}`
        },
        ai: {
            providerEnabled: aiProviderEnabled,
            vectorNativeEnabled,
            lastEmbeddingAt: lastEmbed?.date ? lastEmbed.date.toISOString() : null,
            lastAskAt: lastAsk?.date ? lastAsk.date.toISOString() : null,
        },
        knowledge: {
            docsTotal,
            readyIndexedTotal: readyTotal,
            failedTotal,
            ingestQueueDepth,
            syncQueueDepth,
            lastSyncAt: lastSync?.date ? lastSync.date.toISOString() : null,
        },
        whatsapp: {
            twilioConfigured,
            lastInboundAt: lastInbound?.date ? lastInbound.date.toISOString() : null,
            lastOutboundAt: lastOutbound?.date ? lastOutbound.date.toISOString() : null,
            outboundBlockedByFinops,
        },
        infra: {
            redis: redisHealth,
            db: dbHealth,
            storage: storageHealth,
        },
        ...(isAtLeastManager && { storageReason }), // Add exact S3 errors for manager/admin without breaking interface schema if possible. Let's cast it locally.
        lastUpdatedAt: new Date().toISOString()
    };

    return payload;
}
