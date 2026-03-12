import { and, eq, gte, lte } from 'drizzle-orm';
import { operationalEvents } from '@/drizzle/schema';
import { getDb } from '@/infra/db';

export type FrankAssistOutcomeFilter = 'all' | 'success' | 'fallback' | 'handoff';
export type FrankAssistGranularity = 'day' | 'week';

export interface FrankAssistMetricsFilters {
    tenantId: string;
    from: Date;
    to: Date;
    period: '7d' | '30d' | '90d' | 'custom';
    intent?: string | null;
    outcome?: FrankAssistOutcomeFilter | null;
    q?: string | null;
}

export interface FrankAssistOperationalEventRow {
    tenantId: string;
    eventType: string;
    sessionId: string | null;
    entityId: string | null;
    payload: Record<string, unknown>;
    createdAt: Date;
}

interface FrankAssistResponseEvent {
    tenantId: string;
    sessionId: string | null;
    entityId: string | null;
    intent: string;
    toolUsed: string;
    outcome: 'success' | 'fallback';
    fallbackReason: string | null;
    latencyMs: number;
    createdAt: Date;
}

interface RankedMetricRow {
    key: string;
    count: number;
    share: number;
}

interface ToolMetricRow {
    toolUsed: string;
    total: number;
    successCount: number;
    fallbackCount: number;
    successRate: number;
}

interface VolumeMetricRow {
    bucket: string;
    label: string;
    total: number;
    success: number;
    fallback: number;
}

interface SessionMetricRow {
    label: string;
    interactions: number;
    lastInteractionAt: string;
}

export interface FrankAssistMetricsData {
    tenantId: string;
    generatedAt: string;
    range: {
        from: string;
        to: string;
        period: FrankAssistMetricsFilters['period'];
        granularity: FrankAssistGranularity;
    };
    kpis: {
        totalInteractions: number;
        totalHandoffs: number;
        handoffRate: number;
        avgResponseTimeMs: number;
        uniqueSessions: number;
        knowledgeUsed: number;
        suggestionsGenerated: number;
        suggestionsApproved: number;
        memoryContextHits: number;
    };
    intents: RankedMetricRow[];
    tools: ToolMetricRow[];
    fallbackReasons: RankedMetricRow[];
    volume: VolumeMetricRow[];
    sessions: SessionMetricRow[];
    sourceSummary: {
        primarySource: 'operational_events';
        eventsUsed: string[];
        availableFields: string[];
        notes: string[];
    };
}

function toNonEmptyString(value: unknown, fallback: string): string {
    if (typeof value !== 'string') {
        return fallback;
    }

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : fallback;
}

function toSafeOutcome(value: unknown): 'success' | 'fallback' {
    return value === 'success' ? 'success' : 'fallback';
}

function toLatencyMs(value: unknown): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return Math.max(0, Math.round(value));
    }

    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value);
        if (Number.isFinite(parsed)) {
            return Math.max(0, Math.round(parsed));
        }
    }

    return 0;
}

function normalizeSearchTerm(value?: string | null): string | null {
    const normalized = value?.trim().toLowerCase() ?? '';
    return normalized.length > 0 ? normalized : null;
}

function normalizeOutcomeFilter(outcome?: FrankAssistOutcomeFilter | null): 'success' | 'fallback' | null {
    if (!outcome || outcome === 'all') {
        return null;
    }

    return outcome === 'success' ? 'success' : 'fallback';
}

function toFrankAssistResponseEvent(
    row: FrankAssistOperationalEventRow,
): FrankAssistResponseEvent | null {
    if (row.eventType !== 'frank_assist_response') {
        return null;
    }

    return {
        tenantId: row.tenantId,
        sessionId: row.sessionId,
        entityId: row.entityId,
        intent: toNonEmptyString(row.payload.intent, 'UNKNOWN'),
        toolUsed: toNonEmptyString(row.payload.toolUsed, 'none'),
        outcome: toSafeOutcome(row.payload.outcome),
        fallbackReason:
            row.payload.fallbackReason == null
                ? null
                : toNonEmptyString(row.payload.fallbackReason, 'unspecified'),
        latencyMs: toLatencyMs(row.payload.latencyMs),
        createdAt: row.createdAt,
    };
}

function matchesAssistFilters(
    event: FrankAssistResponseEvent,
    filters: FrankAssistMetricsFilters,
): boolean {
    if (event.tenantId !== filters.tenantId) {
        return false;
    }

    if (event.createdAt < filters.from || event.createdAt > filters.to) {
        return false;
    }

    if (filters.intent?.trim() && event.intent !== filters.intent.trim()) {
        return false;
    }

    const outcome = normalizeOutcomeFilter(filters.outcome);
    if (outcome && event.outcome !== outcome) {
        return false;
    }

    const searchTerm = normalizeSearchTerm(filters.q);
    if (!searchTerm) {
        return true;
    }

    const haystack = [
        event.intent,
        event.toolUsed,
        event.outcome,
        event.fallbackReason ?? '',
    ]
        .join(' ')
        .toLowerCase();

    return haystack.includes(searchTerm);
}

function toPercentage(numerator: number, denominator: number): number {
    if (denominator === 0) {
        return 0;
    }

    return Math.round((numerator / denominator) * 1000) / 10;
}

function startOfUtcDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfUtcWeek(date: Date): Date {
    const day = date.getUTCDay();
    const offset = day === 0 ? -6 : 1 - day;
    const start = startOfUtcDay(date);
    start.setUTCDate(start.getUTCDate() + offset);
    return start;
}

function addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
}

function resolveGranularity(filters: FrankAssistMetricsFilters): FrankAssistGranularity {
    if (filters.period === '90d') {
        return 'week';
    }

    const rangeMs = filters.to.getTime() - filters.from.getTime();
    const rangeDays = Math.ceil(rangeMs / (24 * 60 * 60 * 1000));
    return rangeDays > 45 ? 'week' : 'day';
}

function formatBucketLabel(bucketDate: Date, granularity: FrankAssistGranularity): string {
    const day = bucketDate.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        timeZone: 'UTC',
    });

    if (granularity === 'day') {
        return day;
    }

    return `Sem ${day}`;
}

function buildBucketKey(date: Date, granularity: FrankAssistGranularity): string {
    const base = granularity === 'day' ? startOfUtcDay(date) : startOfUtcWeek(date);
    return base.toISOString().slice(0, 10);
}

function buildVolumeSeries(
    events: FrankAssistResponseEvent[],
    filters: FrankAssistMetricsFilters,
    granularity: FrankAssistGranularity,
): VolumeMetricRow[] {
    const start = granularity === 'day' ? startOfUtcDay(filters.from) : startOfUtcWeek(filters.from);
    const end = granularity === 'day' ? startOfUtcDay(filters.to) : startOfUtcWeek(filters.to);
    const buckets = new Map<string, VolumeMetricRow>();

    for (let cursor = new Date(start); cursor <= end; cursor = granularity === 'day'
        ? addDays(cursor, 1)
        : addDays(cursor, 7)) {
        const bucket = buildBucketKey(cursor, granularity);
        buckets.set(bucket, {
            bucket,
            label: formatBucketLabel(cursor, granularity),
            total: 0,
            success: 0,
            fallback: 0,
        });
    }

    for (const event of events) {
        const bucket = buildBucketKey(event.createdAt, granularity);
        const current = buckets.get(bucket);

        if (!current) {
            continue;
        }

        current.total += 1;
        if (event.outcome === 'success') {
            current.success += 1;
        } else {
            current.fallback += 1;
        }
    }

    return Array.from(buckets.values());
}

function buildRankedRows(
    entries: Iterable<[string, number]>,
    total: number,
    limit = 8,
): RankedMetricRow[] {
    return Array.from(entries)
        .sort((left, right) => {
            if (right[1] !== left[1]) {
                return right[1] - left[1];
            }

            return left[0].localeCompare(right[0]);
        })
        .slice(0, limit)
        .map(([key, count]) => ({
            key,
            count,
            share: toPercentage(count, total),
        }));
}

export function buildFrankAssistMetrics(
    rows: FrankAssistOperationalEventRow[],
    filters: FrankAssistMetricsFilters,
): FrankAssistMetricsData {
    const responseEvents = rows
        .map(toFrankAssistResponseEvent)
        .filter((event): event is FrankAssistResponseEvent => event !== null)
        .filter((event) => matchesAssistFilters(event, filters))
        .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime());

    const totalInteractions = responseEvents.length;
    const totalHandoffs = responseEvents.filter((event) => event.outcome === 'fallback').length;
    const totalLatency = responseEvents.reduce((sum, event) => sum + event.latencyMs, 0);
    const uniqueSessions = new Set(
        responseEvents
            .map((event) => event.sessionId)
            .filter((sessionId): sessionId is string => Boolean(sessionId)),
    ).size;

    const intentCounts = new Map<string, number>();
    const toolCounts = new Map<string, { total: number; successCount: number; fallbackCount: number }>();
    const fallbackCounts = new Map<string, number>();
    const sessionCounts = new Map<string, { count: number; lastInteractionAt: Date }>();

    for (const event of responseEvents) {
        intentCounts.set(event.intent, (intentCounts.get(event.intent) ?? 0) + 1);

        const toolMetrics = toolCounts.get(event.toolUsed) ?? {
            total: 0,
            successCount: 0,
            fallbackCount: 0,
        };
        toolMetrics.total += 1;
        if (event.outcome === 'success') {
            toolMetrics.successCount += 1;
        } else {
            toolMetrics.fallbackCount += 1;
        }
        toolCounts.set(event.toolUsed, toolMetrics);

        if (event.fallbackReason) {
            fallbackCounts.set(event.fallbackReason, (fallbackCounts.get(event.fallbackReason) ?? 0) + 1);
        }

        if (event.sessionId) {
            const sessionMetrics = sessionCounts.get(event.sessionId) ?? {
                count: 0,
                lastInteractionAt: event.createdAt,
            };
            sessionMetrics.count += 1;
            if (event.createdAt > sessionMetrics.lastInteractionAt) {
                sessionMetrics.lastInteractionAt = event.createdAt;
            }
            sessionCounts.set(event.sessionId, sessionMetrics);
        }
    }

    const granularity = resolveGranularity(filters);
    const tools = Array.from(toolCounts.entries())
        .sort((left, right) => {
            if (right[1].total !== left[1].total) {
                return right[1].total - left[1].total;
            }

            return left[0].localeCompare(right[0]);
        })
        .slice(0, 8)
        .map(([toolUsed, metrics]) => ({
            toolUsed,
            total: metrics.total,
            successCount: metrics.successCount,
            fallbackCount: metrics.fallbackCount,
            successRate: toPercentage(metrics.successCount, metrics.total),
        }));

    const sessions = Array.from(sessionCounts.values())
        .sort((left, right) => {
            if (right.count !== left.count) {
                return right.count - left.count;
            }

            return right.lastInteractionAt.getTime() - left.lastInteractionAt.getTime();
        })
        .slice(0, 5)
        .map((session, index) => ({
            label: `Sessao ${index + 1}`,
            interactions: session.count,
            lastInteractionAt: session.lastInteractionAt.toISOString(),
        }));

    return {
        tenantId: filters.tenantId,
        generatedAt: new Date().toISOString(),
        range: {
            from: filters.from.toISOString(),
            to: filters.to.toISOString(),
            period: filters.period,
            granularity,
        },
        kpis: {
            totalInteractions,
            totalHandoffs,
            handoffRate: toPercentage(totalHandoffs, totalInteractions),
            avgResponseTimeMs:
                totalInteractions === 0
                    ? 0
                    : Math.round(totalLatency / totalInteractions),
            uniqueSessions,
            knowledgeUsed: rows.filter(r => r.eventType === 'frank_knowledge_used').length,
            suggestionsGenerated: rows.filter(r => r.eventType === 'frank_suggestion_generated').length,
            suggestionsApproved: rows.filter(r => r.eventType === 'frank_suggestion_approved').length,
            memoryContextHits: rows.filter(r => r.eventType === 'frank_memory_context_loaded').length,
        },
        intents: buildRankedRows(intentCounts.entries(), totalInteractions),
        tools,
        fallbackReasons: buildRankedRows(fallbackCounts.entries(), totalHandoffs),
        volume: buildVolumeSeries(responseEvents, filters, granularity),
        sessions,
        sourceSummary: {
            primarySource: 'operational_events',
            eventsUsed: ['frank_assist_response'],
            availableFields: [
                'tenantId',
                'sessionId',
                'intent',
                'toolUsed',
                'outcome',
                'fallbackReason',
                'latencyMs',
                'timestamp',
            ],
            notes: [
                'customer_timeline_events nao foi necessario para estas agregacoes.',
                'frank_session_state nao e exibido nem acoplado ao painel.',
                'handoffs sao derivados de frank_assist_response com outcome=fallback para evitar dupla contagem.',
            ],
        },
    };
}

export async function getFrankAssistMetrics(
    filters: FrankAssistMetricsFilters,
): Promise<FrankAssistMetricsData> {
    const db = await getDb();
    const eventsToQuery = [
        'frank_assist_response',
        'frank_knowledge_used',
        'frank_suggestion_generated',
        'frank_suggestion_approved',
        'frank_memory_context_loaded',
    ];

    const rows = await db
        .select({
            tenantId: operationalEvents.tenantId,
            eventType: operationalEvents.eventType,
            sessionId: operationalEvents.sessionId,
            entityId: operationalEvents.entityId,
            payload: operationalEvents.payload,
            createdAt: operationalEvents.createdAt,
        })
        .from(operationalEvents)
        .where(
            and(
                eq(operationalEvents.tenantId, filters.tenantId),
                eq(operationalEvents.eventDomain, 'OPERATIONS'),
                gte(operationalEvents.createdAt, filters.from),
                lte(operationalEvents.createdAt, filters.to),
            ),
        );

    // Filter to only relevant event types in application layer
    const filteredRows = rows.filter(r => eventsToQuery.includes(r.eventType));

    return buildFrankAssistMetrics(filteredRows, filters);
}
