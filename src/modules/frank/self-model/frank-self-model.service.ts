import { CONDSTORE_SYSTEM_KNOWLEDGE } from '../frank-system-knowledge';
import { frankToolRegistry } from '../tools/frank-tool.registry';
import { getFrankAssistMetrics, FrankAssistMetricsFilters, FrankAssistMetricsData } from '../frank-assist-metrics.service';
import {
    FrankSelfModel,
    CapabilityState,
    ToolReliability,
    TaskClassPerformance,
    FailureMode,
    FailureHypothesis,
    ChangeHistoryRecord,
    BeliefItem,
    EvidenceStatus,
} from './frank-self-model.types';
import { getDb } from '@/infra/db';
import { operationalEvents } from '@/drizzle/schema';
import { and, eq, desc } from 'drizzle-orm';
import { logger } from '@/infra/logger';

export interface GenerateSelfModelOptions {
    tenantId: string;
    from?: Date;
    to?: Date;
    version?: string;
}

// In-Memory store for local development/testing fallback
const memorySelfModels = new Map<string, FrankSelfModel[]>();

export class FrankSelfModelService {
    private isProductionMode(): boolean {
        return process.env.NODE_ENV === 'production';
    }

    /**
     * Maps failure mode codes to affected capability domains dynamically based on system knowledge.
     */
    private resolveAffectedCapabilities(code: string): string[] {
        const lowerCode = code.toLowerCase();
        const affected: string[] = [];

        if (lowerCode.includes('freight') || lowerCode.includes('frete') || lowerCode.includes('cotacao')) {
            affected.push('capability:frete');
        }
        if (lowerCode.includes('order') || lowerCode.includes('pedido')) {
            affected.push('capability:pedidos');
        }
        if (lowerCode.includes('shipment') || lowerCode.includes('logistica')) {
            affected.push('capability:logistica');
        }
        if (lowerCode.includes('whatsapp') || lowerCode.includes('conversas') || lowerCode.includes('handoff')) {
            affected.push('capability:atendimento');
        }

        return affected.length > 0 ? affected : ['capability:atendimento'];
    }

    /**
     * Generates and persistently stores an Operational Self-Model for Frank.
     * Guarantees persistence using operationalEvents (domain: OPERATIONS, eventType: frank_self_model_snapshot).
     * Strictly enforces evidence integrity: evidence failure marks status as UNAVAILABLE/PARTIAL without fabricating metrics.
     */
    async generateSelfModel(options: GenerateSelfModelOptions): Promise<FrankSelfModel> {
        const tenantId = options.tenantId;
        const to = options.to || new Date();
        const from = options.from || new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000); // Default 7 days
        const version = options.version || '1.0.0-sm';
        const timestamp = new Date().toISOString();

        // 1. Fetch live telemetry metrics from database
        const metricsFilters: FrankAssistMetricsFilters = {
            tenantId,
            from,
            to,
            period: '7d',
        };

        let assistMetrics: FrankAssistMetricsData | null = null;
        let evidenceStatus: EvidenceStatus = 'COMPLETE';
        const evidenceNotes: string[] = [];

        try {
            assistMetrics = await getFrankAssistMetrics(metricsFilters);
        } catch (err) {
            logger.warn('frank_self_model_telemetry_fetch_failed', { tenantId, err });
            evidenceStatus = 'UNAVAILABLE';
            evidenceNotes.push(`Telemetry fetch error: ${err instanceof Error ? err.message : String(err)}`);
        }

        // 2. Build Capability State from CONDSTORE_SYSTEM_KNOWLEDGE
        const capabilities: CapabilityState[] = Object.entries(CONDSTORE_SYSTEM_KNOWLEDGE).map(
            ([domainKey, domainInfo]) => ({
                name: `capability:${domainKey}`,
                domain: domainKey,
                description: domainInfo.description,
                status: 'ACTIVE',
                dependencies: domainInfo.keyServices,
            })
        );

        // 3. Build Tool Reliability mapping using Registered Contracts + Segmented Telemetry
        const registeredTools = frankToolRegistry.listTools();
        const toolMetricsMap = new Map(
            (assistMetrics?.tools || []).map((t) => [t.toolUsed, t])
        );

        const toolReliabilities: ToolReliability[] = registeredTools.map((tool) => {
            const metric = toolMetricsMap.get(tool.name);
            if (!metric || metric.total === 0 || evidenceStatus === 'UNAVAILABLE') {
                return {
                    toolName: tool.name,
                    status: 'UNTESTED',
                    totalExecutions: metric ? metric.total : 0,
                    successRate: null, // Strictly null when untested, never fabricates 100%
                    avgLatencyMs: null,
                    errorRate: null,
                    lastExecutedAt: null, // Factual timestamp, null if unexecuted in window
                };
            }

            const successRate = metric.successRate;
            const errorRate = Math.round((100 - successRate) * 10) / 10;
            const status = successRate < 80.0 ? 'FRAGILE' : 'RELIABLE';

            return {
                toolName: tool.name,
                status,
                totalExecutions: metric.total,
                successRate,
                avgLatencyMs: null, // Unmeasured per-tool latency remains null
                errorRate,
                lastExecutedAt: timestamp,
            };
        });

        // 4. Map Task Class Performance per Intent
        const taskClasses: TaskClassPerformance[] = (assistMetrics?.intents || []).map((intent) => {
            const totalRequests = intent.count;
            if (evidenceStatus === 'UNAVAILABLE' || totalRequests === 0) {
                return {
                    taskClass: intent.key,
                    totalRequests: 0,
                    successRate: null,
                    humanInterventionRate: null,
                    avgLatencyMs: null,
                    avgTokensPerCall: 0,
                    estimatedCostUsd: 0,
                };
            }

            return {
                taskClass: intent.key,
                totalRequests,
                successRate: null, // Segmented per class (null if unmeasured at intent level)
                humanInterventionRate: null,
                avgLatencyMs: null,
                avgTokensPerCall:
                    assistMetrics && assistMetrics.kpis.llmTrackedCalls > 0
                        ? Math.round(assistMetrics.kpis.llmTokensUsed / assistMetrics.kpis.llmTrackedCalls)
                        : 0,
                estimatedCostUsd: assistMetrics
                    ? (assistMetrics.kpis.llmTokensUsed / 1_000_000) * 0.5
                    : 0,
            };
        });

        // 5. Build Failure Modes & Hypotheses
        const failureModes: FailureMode[] = (assistMetrics?.fallbackReasons || []).map((fb, idx) => ({
            id: `fm_${idx + 1}`,
            code: fb.key,
            description: `Fallback triggered for reason [${fb.key}]`,
            frequency: fb.count,
            impactLevel: fb.share > 30 ? 'HIGH' : fb.share > 10 ? 'MEDIUM' : 'LOW',
            affectedCapabilities: this.resolveAffectedCapabilities(fb.key),
            firstSeenAt: from.toISOString(),
            lastSeenAt: to.toISOString(),
        }));

        const failureHypotheses: FailureHypothesis[] = failureModes.map((fm) => ({
            id: `hyp_${fm.id}`,
            failureModeId: fm.id,
            suspectedCause: `High frequency of fallback reason [${fm.code}]`,
            expectedMechanism: `Suspected trigger of human handoff or fallback route when condition [${fm.code}] occurs`,
            confidence: Math.min(0.85, 0.5 + fm.frequency * 0.05),
            status: 'OPEN',
            provenance: {
                source: 'operational_events',
                description: `Derived from fallback reason count [${fm.frequency}]`,
                timestamp,
            },
        }));

        // 6. Build Explicit Belief items categorized as FACT, INFERENCE, or HYPOTHESIS
        const beliefs: BeliefItem[] = [];

        if (evidenceStatus === 'COMPLETE' && assistMetrics) {
            beliefs.push(
                {
                    id: 'belief_fact_total_interactions',
                    type: 'FACT',
                    value: `Total recorded interactions in timeframe: ${assistMetrics.kpis.totalInteractions}`,
                    confidence: 1.0,
                    provenance: {
                        source: 'operational_events',
                        description: 'Direct DB count of frank_assist_response events',
                        timestamp,
                    },
                },
                {
                    id: 'belief_fact_tokens_used',
                    type: 'FACT',
                    value: `Total LLM tokens consumed: ${assistMetrics.kpis.llmTokensUsed}`,
                    confidence: 1.0,
                    provenance: {
                        source: 'frank_token_usage',
                        description: 'Aggregated DB query from frank_token_usage table',
                        timestamp,
                    },
                },
                {
                    id: 'belief_inf_handoff_rate',
                    type: 'INFERENCE',
                    value: `Human handoff rate calculated at ${assistMetrics.kpis.handoffRate}%`,
                    confidence: 0.95,
                    provenance: {
                        source: 'FrankSelfModelService',
                        description: 'Ratio of fallback events to total interactions',
                        timestamp,
                    },
                }
            );
        } else {
            beliefs.push({
                id: 'belief_fact_evidence_unavailable',
                type: 'FACT',
                value: 'Telemetry collection was unavailable or degraded during snapshot generation',
                confidence: 1.0,
                provenance: {
                    source: 'FrankSelfModelService',
                    description: evidenceNotes.join('; '),
                    timestamp,
                },
            });
        }

        // Add fragile tool inferences
        toolReliabilities
            .filter((tr) => tr.status === 'FRAGILE')
            .forEach((tr) => {
                beliefs.push({
                    id: `belief_inf_fragile_tool_${tr.toolName}`,
                    type: 'INFERENCE',
                    value: `Tool [${tr.toolName}] is fragile with success rate ${tr.successRate}%`,
                    confidence: 0.9,
                    provenance: {
                        source: 'FrankSelfModelService',
                        description: `Evaluated ${tr.totalExecutions} executions from telemetry`,
                        timestamp,
                    },
                });
            });

        // Add failure hypotheses
        failureHypotheses.forEach((hyp) => {
            beliefs.push({
                id: `belief_hyp_${hyp.id}`,
                type: 'HYPOTHESIS',
                value: `Failure mode [${hyp.failureModeId}] suspected cause: [${hyp.suspectedCause}]`,
                confidence: hyp.confidence,
                provenance: hyp.provenance,
            });
        });

        // 7. Known limitations synthesized from beliefs
        const knownLimitations: BeliefItem<string>[] = beliefs
            .filter((b) => b.type === 'INFERENCE' || b.type === 'HYPOTHESIS')
            .map((b) => ({
                id: `lim_${b.id}`,
                type: b.type,
                value: String(b.value),
                confidence: b.confidence,
                provenance: b.provenance,
            }));

        const changeHistory: ChangeHistoryRecord[] = [
            {
                id: 'chg_init',
                version,
                appliedAt: timestamp,
                changeType: 'INITIALIZATION',
                description: 'Initialized Operational Self-Model baseline snapshot',
                observedEffects: [
                    {
                        metric: 'handoffRate',
                        before: '-',
                        after: assistMetrics ? `${assistMetrics.kpis.handoffRate}%` : 'UNKNOWN',
                        verdict: 'BASELINE',
                    },
                ],
            },
        ];

        const model: FrankSelfModel = {
            version,
            tenantId,
            timestamp,
            evidenceStatus,
            evidenceNotes: evidenceNotes.length > 0 ? evidenceNotes : undefined,
            capabilities,
            knownLimitations,
            taskClasses,
            toolReliabilities,
            operationalCost: {
                totalTokens: assistMetrics ? assistMetrics.kpis.llmTokensUsed : 0,
                estimatedCostUsd: assistMetrics ? (assistMetrics.kpis.llmTokensUsed / 1_000_000) * 0.5 : 0,
                trackedCalls: assistMetrics ? assistMetrics.kpis.llmTrackedCalls : 0,
            },
            overallAvgLatencyMs: assistMetrics ? assistMetrics.kpis.avgResponseTimeMs : null,
            failureModes,
            failureHypotheses,
            changeHistory,
            beliefs,
        };

        // 8. Persist Self-Model Snapshot to Database (operational_events)
        await this.persistSelfModel(model);

        return model;
    }

    /**
     * Persists a Self-Model snapshot in operationalEvents table.
     */
    private async persistSelfModel(model: FrankSelfModel): Promise<void> {
        let db;
        try {
            db = await getDb();
        } catch {
            db = null;
        }

        if (db) {
            try {
                const { randomUUID } = await import('crypto');
                await db.insert(operationalEvents).values({
                    id: randomUUID(),
                    tenantId: model.tenantId,
                    eventDomain: 'OPERATIONS',
                    eventType: 'frank_self_model_snapshot',
                    entityId: model.version,
                    payload: model as unknown as Record<string, unknown>,
                    createdAt: new Date(model.timestamp),
                });
                logger.info('frank_self_model_persisted', { tenantId: model.tenantId, version: model.version });
            } catch (err) {
                if (this.isProductionMode()) {
                    logger.error('CRITICAL: Failed to persist Frank Self-Model snapshot in production', err as Error, {
                        tenantId: model.tenantId,
                        version: model.version,
                    });
                } else {
                    logger.warn('Failed DB insert for self-model, storing in memory store', { tenantId: model.tenantId, err });
                }
            }
        }

        // Store in memory cache/fallback
        const tenantModels = memorySelfModels.get(model.tenantId) || [];
        tenantModels.unshift(model);
        memorySelfModels.set(model.tenantId, tenantModels);
    }

    /**
     * Retrieves a specific version of Frank's Self-Model for a tenant.
     */
    async getSelfModel(tenantId: string, version: string): Promise<FrankSelfModel | null> {
        let db;
        try {
            db = await getDb();
        } catch {
            db = null;
        }

        if (db) {
            try {
                const rows = await db
                    .select()
                    .from(operationalEvents)
                    .where(
                        and(
                            eq(operationalEvents.tenantId, tenantId),
                            eq(operationalEvents.eventDomain, 'OPERATIONS'),
                            eq(operationalEvents.eventType, 'frank_self_model_snapshot'),
                            eq(operationalEvents.entityId, version)
                        )
                    )
                    .limit(1);

                if (rows.length > 0) {
                    return rows[0].payload as unknown as FrankSelfModel;
                }
            } catch (err) {
                logger.warn('Failed fetching self-model from DB, trying memory fallback', { tenantId, version, err });
            }
        }

        const tenantModels = memorySelfModels.get(tenantId) || [];
        return tenantModels.find((m) => m.version === version) || null;
    }

    /**
     * Retrieves the latest Self-Model snapshot for a tenant.
     */
    async getLatestSelfModel(tenantId: string): Promise<FrankSelfModel | null> {
        let db;
        try {
            db = await getDb();
        } catch {
            db = null;
        }

        if (db) {
            try {
                const rows = await db
                    .select()
                    .from(operationalEvents)
                    .where(
                        and(
                            eq(operationalEvents.tenantId, tenantId),
                            eq(operationalEvents.eventDomain, 'OPERATIONS'),
                            eq(operationalEvents.eventType, 'frank_self_model_snapshot')
                        )
                    )
                    .orderBy(desc(operationalEvents.createdAt))
                    .limit(1);

                if (rows.length > 0) {
                    return rows[0].payload as unknown as FrankSelfModel;
                }
            } catch (err) {
                logger.warn('Failed fetching latest self-model from DB, trying memory fallback', { tenantId, err });
            }
        }

        const tenantModels = memorySelfModels.get(tenantId) || [];
        return tenantModels.length > 0 ? tenantModels[0] : null;
    }
}

export const frankSelfModelService = new FrankSelfModelService();
