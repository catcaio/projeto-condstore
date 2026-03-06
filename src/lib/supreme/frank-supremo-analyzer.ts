/**
 * frank-supremo-analyzer.ts
 * Intelligence layer reading from metrics/events and recommending actions.
 */

import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '@/infra/db';
import { supremeFindings } from '@/drizzle/schema';
import { structuredLogger } from '@/infra/log/logger';
import { getTenantCoreMetrics } from '@/lib/metrics/cockpit-metrics-engine';
import { publishOperationalEvent } from '@/lib/events/operational-event-bus';
import { proposeAction } from '@/lib/actions/action-engine';
import { evaluatePlaybooks } from '@/lib/supreme/playbook-engine';

// ── Types ───────────────────────────────────────────────────────────────────

export type FindingDomain = 'ACQUISITION' | 'CONVERSION' | 'OPERATIONS' | 'REVENUE' | 'RETENTION';
export type FindingSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type FindingStatus = 'OPEN' | 'ACTION_PROPOSED' | 'RESOLVED' | 'DISMISSED';

export interface NewFindingData {
    findingType: string;
    findingDomain: FindingDomain;
    severity: FindingSeverity;
    title: string;
    summary: string;
    evidence: Record<string, unknown>;
    recommendedActionType?: string;
    recommendedActionPayload?: Record<string, unknown>;
}

// ── Analyzer Logic ────────────────────────────────────────────────────────────

/**
 * Analyzes tenant metrics and creates/updates findings.
 * Does not throw on missing metric data; falls back safely.
 */
export async function analyzeTenant(tenantId: string, rangeDays: number = 30) {
    structuredLogger.info('supreme_analysis_started', { tenantId, rangeDays });

    const to = new Date();
    const from = new Date(to.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const prevFrom = new Date(from.getTime() - rangeDays * 24 * 60 * 60 * 1000);
    const prevTo = from;

    // Retrieve current window metrics
    const core = await getTenantCoreMetrics(tenantId, { from, to });

    // Retrieve previous window directly (we just need REVENUE and some raw sums)
    // For safety, catching in case of network/db flake, grace degradation
    let prevCore: any = null;
    try {
        prevCore = await getTenantCoreMetrics(tenantId, { from: prevFrom, to: prevTo });
    } catch (err) {
        structuredLogger.warn('supreme_analyzer_metrics_degraded', { tenantId, period: 'previous' });
    }

    const newFindings: NewFindingData[] = [];

    // RULE 1: CONVERSION — Low Quote to Order Rate
    if (core.conversion.quotes_total >= 10 && core.conversion.quote_to_order_rate < 0.15) {
        newFindings.push({
            findingType: 'low_quote_to_order_rate',
            findingDomain: 'CONVERSION',
            severity: 'HIGH',
            title: 'Taxa de conversão (Cotação → Pedido) crítica',
            summary: `Apenas ${(core.conversion.quote_to_order_rate * 100).toFixed(1)}% das cotações viram pedidos.`,
            evidence: { rate: core.conversion.quote_to_order_rate, quotes: core.conversion.quotes_total },
            recommendedActionType: 'adjust_quote_margin',
            recommendedActionPayload: { suggestedAdjustmentPercent: -2 }, // Suggest dropping margin slightly
        });
    }

    // RULE 2: CONVERSION — High Checkout Dropoff
    if (core.conversion.checkout_started_total >= 10 && core.conversion.checkout_completion_rate < 0.35) {
        newFindings.push({
            findingType: 'checkout_dropoff_high',
            findingDomain: 'CONVERSION',
            severity: 'HIGH',
            title: 'Alta desistência no Checkout',
            summary: `Somente ${(core.conversion.checkout_completion_rate * 100).toFixed(1)}% das sessões de checkout foram concluídas.`,
            evidence: { rate: core.conversion.checkout_completion_rate, started: core.conversion.checkout_started_total },
            recommendedActionType: 'adjust_checkout_incentive',
            recommendedActionPayload: { incentive: 'free_shipping_unlock' },
        });
    }

    // RULE 3: RETENTION — Low Repeat Orders
    if (core.conversion.orders_total >= 10 && core.retention.repeat_orders_total === 0) {
        newFindings.push({
            findingType: 'repeat_order_low',
            findingDomain: 'RETENTION',
            severity: 'MEDIUM',
            title: 'Baixa Recompra Identificada',
            summary: 'Nenhum cliente realizou uma segunda compra no período avaliado.',
            evidence: { orders: core.conversion.orders_total, repeat: 0 },
            recommendedActionType: 'trigger_reactivation_sequence',
            recommendedActionPayload: { urgency: 'high' },
        });
    }

    // RULE 4: OPERATIONS — High Response Time
    // Wait, messages_received_total and avg_response_time_ms aren't fully populated by the generic event count yet, 
    // but if operational events injected them, we check it. We default to 0.
    if (core.operations.messages_received_total > 0 && ((core.operations as any).avg_response_time_ms ?? 0) > 300000) {
        newFindings.push({
            findingType: 'response_time_high',
            findingDomain: 'OPERATIONS',
            severity: 'MEDIUM',
            title: 'Tempo de Resposta Elevado',
            summary: `O SLA médio está em ${Math.round(((core.operations as any).avg_response_time_ms ?? 0) / 60000)} minutos. Risco de perda de engajamento.`,
            evidence: { avgMs: (core.operations as any).avg_response_time_ms },
            recommendedActionType: 'update_auto_reply_flow',
            recommendedActionPayload: { active_greeting: true },
        });
    }

    // RULE 5: REVENUE — Revenue Drop vs Previous Period
    if (prevCore && prevCore.revenue.payments_confirmed_total >= 5) {
        const dropsTo = prevCore.revenue.payments_confirmed_total * 0.7; // 30% drop threshold
        if (core.revenue.payments_confirmed_total < dropsTo) {
            newFindings.push({
                findingType: 'revenue_drop',
                findingDomain: 'REVENUE',
                severity: 'CRITICAL',
                title: 'Queda brusca de Receita Confirmada',
                summary: `O volume de pagamentos caiu significativamente em comparação ao período anterior.`,
                evidence: {
                    current: core.revenue.payments_confirmed_total,
                    previous: prevCore.revenue.payments_confirmed_total,
                    dropPercent: 1 - (core.revenue.payments_confirmed_total / prevCore.revenue.payments_confirmed_total)
                },
                // Optional: could recommend adjust_campaign_budget or generic alert
            });
        }
    }

    // Persist findings
    const db = await getDb();
    let createdCount = 0;

    for (const f of newFindings) {
        // Basic deduplication: limit 1 OPEN finding of the same type per tenant
        const existing = await db
            .select({ id: supremeFindings.id })
            .from(supremeFindings)
            .where(and(
                eq(supremeFindings.tenantId, tenantId),
                eq(supremeFindings.findingType, f.findingType),
                eq(supremeFindings.status, 'OPEN')
            ))
            .limit(1);

        if (existing.length === 0) {
            const id = crypto.randomUUID();
            await db.insert(supremeFindings).values({
                id,
                tenantId,
                findingType: f.findingType,
                findingDomain: f.findingDomain,
                severity: f.severity,
                title: f.title,
                summary: f.summary,
                evidence: f.evidence,
                recommendedActionType: f.recommendedActionType,
                recommendedActionPayload: f.recommendedActionPayload,
                status: 'OPEN',
            });
            createdCount++;

            void publishOperationalEvent({
                tenantId,
                eventType: 'supreme_finding_created',
                eventDomain: 'OPERATIONS',
                entityId: id,
                payload: { findingType: f.findingType, severity: f.severity },
            });

            // Auto-evaluate this finding against known Playbooks
            // Running non-blocking intentionally or awaited? Awaited so we can return counts if needed
            try {
                await evaluatePlaybooks(tenantId, [{ id, findingType: f.findingType }]);
            } catch (err: any) {
                structuredLogger.error('supreme_analyzer_playbook_trigger_failed', { tenantId, findingId: id, error: err.message });
            }
        }
    }

    void publishOperationalEvent({
        tenantId,
        eventType: 'supreme_analysis_completed',
        eventDomain: 'OPERATIONS',
        payload: { rangeDays, findingsGenerated: createdCount },
    });

    return { findingsGenerated: createdCount };
}

// ── Read operations ──────────────────────────────────────────────────────────

export interface FindingListFilter {
    status?: FindingStatus;
    domain?: FindingDomain;
    limit?: number;
}

export async function listFindings(tenantId: string, filter: FindingListFilter = {}) {
    const db = await getDb();
    const limit = filter.limit ?? 50;

    const conditions = [eq(supremeFindings.tenantId, tenantId)];
    if (filter.status) conditions.push(eq(supremeFindings.status, filter.status));
    if (filter.domain) conditions.push(eq(supremeFindings.findingDomain, filter.domain));

    const rows = await db
        .select()
        .from(supremeFindings)
        .where(and(...conditions))
        .orderBy(desc(supremeFindings.createdAt))
        .limit(limit);

    return rows;
}

// ── State mutations ───────────────────────────────────────────────────────────

export async function resolveFinding(tenantId: string, findingId: string) {
    const db = await getDb();
    const rows = await db.select().from(supremeFindings).where(and(eq(supremeFindings.tenantId, tenantId), eq(supremeFindings.id, findingId))).limit(1);
    if (!rows[0]) throw new Error(`Finding ${findingId} not found`);

    await db.update(supremeFindings)
        .set({ status: 'RESOLVED', resolvedAt: new Date() })
        .where(eq(supremeFindings.id, findingId));

    void publishOperationalEvent({
        tenantId,
        eventType: 'supreme_finding_resolved',
        eventDomain: 'OPERATIONS',
        entityId: findingId,
        payload: {},
    });

    return { id: findingId, status: 'RESOLVED' };
}

// ── Integration with Action Engine ────────────────────────────────────────────

import { ACTION_TYPE_TO_SCOPE, ActionScope } from '@/lib/actions/action-types';

export async function proposeRecommendedAction(tenantId: string, findingId: string, proposedBy: string) {
    const db = await getDb();
    const rows = await db.select().from(supremeFindings).where(and(eq(supremeFindings.tenantId, tenantId), eq(supremeFindings.id, findingId))).limit(1);
    const finding = rows[0];

    if (!finding) throw new Error(`Finding ${findingId} not found`);
    if (!finding.recommendedActionType) throw new Error('No recommended action for this finding');
    if (finding.status !== 'OPEN') throw new Error(`Cannot propose action for finding in status ${finding.status}`);

    // Retrieve scope for the action
    const scopeStr = ACTION_TYPE_TO_SCOPE[finding.recommendedActionType];
    if (!scopeStr) throw new Error(`Unknown scope for action type: ${finding.recommendedActionType}`);

    const actionScope = scopeStr as ActionScope;

    // Call Action Engine
    const actionResult = await proposeAction({
        tenantId,
        actionType: finding.recommendedActionType,
        actionScope,
        proposedBy,
        payload: {
            ...((finding.recommendedActionPayload as Record<string, unknown>) ?? {}),
            _sourceFindingId: findingId,
        },
    });

    // Update finding status
    await db.update(supremeFindings)
        .set({ status: 'ACTION_PROPOSED' })
        .where(eq(supremeFindings.id, findingId));

    return { actionId: actionResult.id, findingStatus: 'ACTION_PROPOSED' };
}
