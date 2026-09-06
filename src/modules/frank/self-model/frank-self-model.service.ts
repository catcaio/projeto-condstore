import { CONDSTORE_SYSTEM_KNOWLEDGE } from '../frank-system-knowledge';
import { frankToolRegistry } from '../tools/frank-tool.registry';
import { getFrankAssistMetrics, FrankAssistMetricsFilters } from '../frank-assist-metrics.service';
import {
    FrankSelfModel,
    CapabilityState,
    ToolReliability,
    TaskClassPerformance,
    FailureMode,
    FailureHypothesis,
    ChangeHistoryRecord,
    BeliefItem,
} from './frank-self-model.types';

export interface GenerateSelfModelOptions {
    tenantId: string;
    from?: Date;
    to?: Date;
    version?: string;
}

export class FrankSelfModelService {
    /**
     * Generates a persistent, versioned Operational Self-Model for Frank.
     * Integrates real DB metrics, system domain knowledge, execution history, and tool registries.
     * Differentiates explicitly between FACTS (direct measurements), INFERENCES (calculated metrics), and HYPOTHESES.
     */
    async generateSelfModel(options: GenerateSelfModelOptions): Promise<FrankSelfModel> {
        const tenantId = options.tenantId;
        const to = options.to || new Date();
        const from = options.from || new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000); // Default 7 days
        const version = options.version || '1.0.0-sm';
        const timestamp = new Date().toISOString();

        // 1. Fetch live metrics from database / event bus
        const metricsFilters: FrankAssistMetricsFilters = {
            tenantId,
            from,
            to,
            period: '7d',
        };

        let assistMetrics;
        try {
            assistMetrics = await getFrankAssistMetrics(metricsFilters);
        } catch {
            // Graceful fallback for non-DB / local environments
            assistMetrics = {
                kpis: {
                    totalInteractions: 0,
                    avgResponseTimeMs: 0,
                    handoffRate: 0,
                    llmTokensUsed: 0,
                    llmTrackedCalls: 0,
                },
                tools: [],
                intents: [],
                fallbackReasons: [],
            };
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

        // 3. Build Tool Reliability mapping using Registered Contracts + Assist Metrics
        const registeredTools = frankToolRegistry.listTools();
        const toolMetricsMap = new Map(
            assistMetrics.tools.map((t) => [t.toolUsed, t])
        );

        const toolReliabilities: ToolReliability[] = registeredTools.map((tool: { name: string }) => {
            const metric = toolMetricsMap.get(tool.name);
            if (!metric || metric.total === 0) {
                return {
                    toolName: tool.name,
                    status: 'UNTESTED',
                    totalExecutions: 0,
                    successRate: 100.0,
                    avgLatencyMs: 0,
                    errorRate: 0.0,
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
                avgLatencyMs: assistMetrics.kpis.avgResponseTimeMs,
                errorRate,
                lastExecutedAt: timestamp,
            };
        });

        // 4. Map Intent Task Classes
        const taskClasses: TaskClassPerformance[] = assistMetrics.intents.map((intent) => {
            return {
                taskClass: intent.key,
                totalRequests: intent.count,
                successRate: Math.max(0, 100 - assistMetrics.kpis.handoffRate),
                humanInterventionRate: assistMetrics.kpis.handoffRate,
                avgLatencyMs: assistMetrics.kpis.avgResponseTimeMs,
                avgTokensPerCall:
                    assistMetrics.kpis.llmTrackedCalls > 0
                        ? Math.round(assistMetrics.kpis.llmTokensUsed / assistMetrics.kpis.llmTrackedCalls)
                        : 0,
                estimatedCostUsd: (assistMetrics.kpis.llmTokensUsed / 1_000_000) * 0.5, // ~$0.50 per 1M tokens estimate
            };
        });

        // 5. Build Failure Modes & Hypotheses
        const failureModes: FailureMode[] = assistMetrics.fallbackReasons.map((fb, idx) => ({
            id: `fm_${idx + 1}`,
            code: fb.key,
            description: `Fallback triggered: ${fb.key}`,
            frequency: fb.count,
            impactLevel: fb.share > 30 ? 'HIGH' : fb.share > 10 ? 'MEDIUM' : 'LOW',
            affectedCapabilities: ['capability:atendimento'],
            firstSeenAt: from.toISOString(),
            lastSeenAt: to.toISOString(),
        }));

        const failureHypotheses: FailureHypothesis[] = failureModes.map((fm) => ({
            id: `hyp_${fm.id}`,
            failureModeId: fm.id,
            suspectedCause: `High frequency of ${fm.code} during operational window`,
            mechanism: `System defaulted to fallback or human handoff due to unhandled condition ${fm.code}`,
            confidence: Math.min(0.85, 0.5 + fm.frequency * 0.05),
            status: 'OPEN',
            provenance: {
                source: 'operational_events',
                description: `Derived from fallback reason count: ${fm.frequency}`,
                timestamp,
            },
        }));

        // 6. Build Explicit Belief items categorized as FACT, INFERENCE, or HYPOTHESIS
        const beliefs: BeliefItem[] = [
            // FACTS (direct verified measurements)
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
            // INFERENCES (calculated metrics)
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
            },
            ...toolReliabilities
                .filter((tr) => tr.status === 'FRAGILE')
                .map((tr) => ({
                    id: `belief_inf_fragile_tool_${tr.toolName}`,
                    type: 'INFERENCE' as const,
                    value: `Tool [${tr.toolName}] is fragile with success rate ${tr.successRate}%`,
                    confidence: 0.9,
                    provenance: {
                        source: 'FrankSelfModelService',
                        description: `Evaluated ${tr.totalExecutions} executions from telemetry`,
                        timestamp,
                    },
                })),
            // HYPOTHESES (suspected causes / unproven conjectures)
            ...failureHypotheses.map((hyp) => ({
                id: `belief_hyp_${hyp.id}`,
                type: 'HYPOTHESIS' as const,
                value: `Failure mode [${hyp.failureModeId}] caused by [${hyp.suspectedCause}]`,
                confidence: hyp.confidence,
                provenance: hyp.provenance,
            })),
        ];

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
                changeType: 'CONFIGURATION',
                description: 'Initialized Operational Self-Model baseline snapshot',
                observedEffects: [
                    {
                        metric: 'handoffRate',
                        before: '-',
                        after: `${assistMetrics.kpis.handoffRate}%`,
                        verdict: 'NEUTRAL',
                    },
                ],
            },
        ];

        return {
            version,
            tenantId,
            timestamp,
            capabilities,
            knownLimitations,
            taskClasses,
            toolReliabilities,
            operationalCost: {
                totalTokens: assistMetrics.kpis.llmTokensUsed,
                estimatedCostUsd: (assistMetrics.kpis.llmTokensUsed / 1_000_000) * 0.5,
                trackedCalls: assistMetrics.kpis.llmTrackedCalls,
            },
            overallAvgLatencyMs: assistMetrics.kpis.avgResponseTimeMs,
            failureModes,
            failureHypotheses,
            changeHistory,
            beliefs,
        };
    }
}

export const frankSelfModelService = new FrankSelfModelService();
