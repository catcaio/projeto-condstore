'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCcw, TrendingUp, ArrowRightLeft, TimerReset, Sparkles, Check, Pencil, X, ShieldAlert, Activity, ShieldCheck, Cpu } from 'lucide-react';
import { SettingsPage, SettingsSection } from '@/ui/settings';
import { Card } from '@/ui/components/card';
import { Badge } from '@/ui/components/badge';
import { Button } from '@/ui/components/button';
import { EmptyState } from '@/ui/components/EmptyState';
import { FilterBar } from '@/ui/components/filters/FilterBar';
import {
    FRANK_ASSIST_FILTER_KEYS,
    type FrankAssistFilterSchema,
} from '@/ui/components/filters/schemas/frank-assist';
import { useSearchParams } from 'next/navigation';

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

interface SupervisorData {
    status: string;
    health: {
        active: boolean;
        lastObservationAt: string | null;
        lastEvent: string | null;
        lastExecutionId: string | null;
        lastFailure: string | null;
        failuresCount: number;
        totalSignalsObserved: number;
        activeIncidentsCount: number;
        nextCycleAt: string | null;
    };
    activeExecutions: Array<{
        id: string;
        executionId: string;
        title: string;
        status: string;
        autonomyLevel: string;
        currentStep: string | null;
        createdAt: string;
    }>;
}

interface FrankAssistMetricsData {
    tenantId: string;
    generatedAt: string;
    range: {
        from: string;
        to: string;
        period: string;
        granularity: 'day' | 'week';
    };
    kpis: {
        totalInteractions: number;
        totalHandoffs: number;
        handoffRate: number;
        avgResponseTimeMs: number;
        uniqueSessions: number;
        suggestionsGenerated: number;
        suggestionsApproved: number;
        suggestionsEdited: number;
        suggestionsRejected: number;
    };
    intents: RankedMetricRow[];
    tools: ToolMetricRow[];
    fallbackReasons: RankedMetricRow[];
    volume: VolumeMetricRow[];
    sessions: SessionMetricRow[];
    sourceSummary: {
        primarySource: string;
        notes: string[];
    };
}

function formatPercent(value: number): string {
    return `${value.toFixed(1)}%`;
}

function formatDateTime(value: string): string {
    return new Date(value).toLocaleString('pt-BR');
}

function MetricCard(props: {
    title: string;
    value: string;
    helper: string;
    icon: ReactNode;
}) {
    return (
        <Card className="border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] p-4">
            <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                    <div className="text-xs font-medium uppercase tracking-[0.12em] text-[hsl(var(--ui-text-muted))]">
                        {props.title}
                    </div>
                    <div className="text-2xl font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                        {props.value}
                    </div>
                    <div className="text-xs text-[hsl(var(--ui-text-muted))]">
                        {props.helper}
                    </div>
                </div>
                <div className="rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] p-2 text-[hsl(var(--ui-text-muted))]">
                    {props.icon}
                </div>
            </div>
        </Card>
    );
}

function MetricTable(props: {
    title: string;
    description: string;
    headers: string[];
    rows: Array<Array<React.ReactNode>>;
    emptyLabel: string;
}) {
    return (
        <div className="p-4">
            <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">{props.title}</h3>
                    <p className="text-xs text-[hsl(var(--ui-text-muted))]">{props.description}</p>
                </div>
            </div>

            {props.rows.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-4 py-6 text-sm text-[hsl(var(--ui-text-muted))]">
                    {props.emptyLabel}
                </div>
            ) : (
                <div className="overflow-x-auto rounded-lg border border-[hsl(var(--ui-border))]">
                    <table className="min-w-full divide-y divide-[hsl(var(--ui-border))] text-sm">
                        <thead className="bg-[hsl(var(--ui-bg-subtle))] text-left text-[hsl(var(--ui-text-muted))]">
                            <tr>
                                {props.headers.map((header) => (
                                    <th key={header} className="px-4 py-3 font-medium">
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))]">
                            {props.rows.map((row, index) => (
                                <tr key={`${props.title}-${index}`}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={`${props.title}-${index}-${cellIndex}`} className="px-4 py-3 align-top">
                                            {cell}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

function VolumeChart({ data }: { data: VolumeMetricRow[] }) {
    const maxValue = Math.max(...data.map((item) => item.total), 1);

    return (
        <div className="p-4">
            <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                    <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Volume no tempo</h3>
                    <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                        Interações assistidas por bucket temporal.
                    </p>
                </div>
                <Badge variant="muted">{data.length} buckets</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
                {data.map((item) => {
                    const height = `${Math.max(10, Math.round((item.total / maxValue) * 100))}%`;

                    return (
                        <div
                            key={item.bucket}
                            className="rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] p-3"
                        >
                            <div className="flex h-28 items-end">
                                <div className="w-full rounded-md bg-[hsl(var(--ui-accent-blue))] transition-all" style={{ height }} />
                            </div>
                            <div className="mt-3 space-y-1">
                                <div className="text-xs font-medium text-[hsl(var(--ui-text))]">{item.label}</div>
                                <div className="text-lg font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                                    {item.total}
                                </div>
                                <div className="text-[11px] text-[hsl(var(--ui-text-muted))]">
                                    {item.success} sucesso • {item.fallback} handoff
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-32 animate-pulse rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]"
                    />
                ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]" />
        </div>
    );
}

function ErrorState(props: { message: string }) {
    return (
        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] p-6">
            <div className="text-base font-semibold text-[hsl(var(--ui-text))]">Falha ao carregar o painel</div>
            <div className="mt-2 text-sm text-[hsl(var(--ui-text-muted))]">{props.message}</div>
        </div>
    );
}

export function FrankAssistCockpitClient() {
    const searchParams = useSearchParams();
    const [data, setData] = useState<FrankAssistMetricsData | null>(null);
    const [supervisor, setSupervisor] = useState<SupervisorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const queryString = searchParams.toString();

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const [metricsRes, supervisorRes] = await Promise.all([
                fetch(`/api/cockpit/metrics/frank?${queryString}`, { cache: 'no-store' }),
                fetch(`/api/cockpit/frank/supervisor`, { cache: 'no-store' })
            ]);

            const json = await metricsRes.json();
            if (metricsRes.ok && json?.ok && json?.data) {
                setData(json.data);
            }

            if (supervisorRes.ok) {
                const supJson = await supervisorRes.json();
                if (supJson?.success) {
                    setSupervisor({
                        status: supJson.status,
                        health: supJson.health,
                        activeExecutions: supJson.activeExecutions || [],
                    });
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro inesperado ao carregar dados.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        void loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryString]);

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link
                href="/cockpit"
                className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--ui-accent-blue))] hover:underline"
            >
                <ArrowLeft className="h-3.5 w-3.5" />
                Cockpit
            </Link>
            <Button variant="secondary" onClick={() => void loadData()} className="gap-2">
                <RefreshCcw className="h-4 w-4" />
                Atualizar
            </Button>
        </div>
    );

    const isEmpty = !loading && !error && data?.kpis.totalInteractions === 0 && (!supervisor || supervisor.activeExecutions.length === 0);

    return (
        <SettingsPage
            title="Frank Supremo — Supervisor Operacional"
            description="Observabilidade contínua do supervisor operacional ativo (Fase 2): investigações duráveis, Human Gate e telemetria do sistema."
            headerAction={headerAction}
            className="max-w-6xl"
        >
            <FilterBar<FrankAssistFilterSchema>
                allowedKeys={FRANK_ASSIST_FILTER_KEYS}
                defaults={{
                    period: '30d',
                    outcome: 'all',
                }}
                storageKey="condstore.savedViews.frank-assist"
                searchPlaceholder="Buscar por intenção, tool ou motivo de fallback..."
                fastFilters={(filters, updateFilter) => (
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            className="h-10 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-3 text-sm text-[hsl(var(--ui-text))]"
                            value={filters.period || '30d'}
                            onChange={(event) => updateFilter('period', event.target.value)}
                        >
                            <option value="7d" className="bg-[hsl(var(--ui-surface))]">7 dias</option>
                            <option value="30d" className="bg-[hsl(var(--ui-surface))]">30 dias</option>
                            <option value="90d" className="bg-[hsl(var(--ui-surface))]">90 dias</option>
                        </select>
                    </div>
                )}
            />

            {loading && !data ? <LoadingSkeleton /> : null}
            {!loading && error ? <ErrorState message={error} /> : null}

            {/* Frank Supervisor Operational Runtime Health */}
            {supervisor ? (
                <SettingsSection
                    title="Frank Supremo Runtime Status (Fase 2)"
                    description="Estado observacional contínuo do supervisor em tempo real."
                >
                    <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard
                            title="Estado do Supervisor"
                            value={supervisor.status || 'ACTIVE'}
                            helper={supervisor.health?.lastEvent ? `Último evento: ${supervisor.health.lastEvent}` : 'Observer monitorando telemetria'}
                            icon={<ShieldCheck className="h-5 w-5 text-emerald-500" />}
                        />
                        <MetricCard
                            title="Sinais Observados"
                            value={String(supervisor.health?.totalSignalsObserved || 0)}
                            helper="Telemetria e anomalias capturadas pelo Observer."
                            icon={<Activity className="h-5 w-5 text-indigo-500" />}
                        />
                        <MetricCard
                            title="Incidentes Ativos"
                            value={String(supervisor.health?.activeIncidentsCount || 0)}
                            helper="Casos correlacionados em investigação."
                            icon={<ShieldAlert className="h-5 w-5 text-amber-500" />}
                        />
                        <MetricCard
                            title="Execuções Ativas"
                            value={String(supervisor.activeExecutions?.length || 0)}
                            helper="Workflow durável com Human Gate pendente."
                            icon={<Cpu className="h-5 w-5 text-blue-500" />}
                        />
                    </div>
                </SettingsSection>
            ) : null}

            {isEmpty ? (
                <EmptyState
                    title="Ainda não há dados suficientes do Frank assistente"
                    description="Assim que o atendimento assistido gerar interações em operational_events, este painel vai exibir volume, handoffs, tools e motivos de fallback por tenant."
                />
            ) : null}

            {!loading && !error && data ? (
                <>
                    <SettingsSection
                        title="Leitura operacional"
                        description="O que o Frank esta absorvendo, onde transfere para humano e quao rapido responde."
                    >
                        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Atendimentos"
                                value={String(data.kpis.totalInteractions)}
                                helper="Total de respostas assistidas no recorte atual."
                                icon={<Bot className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Handoffs"
                                value={String(data.kpis.totalHandoffs)}
                                helper="Solicitacoes que precisaram de transferencia segura."
                                icon={<ArrowRightLeft className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Taxa de handoff"
                                value={formatPercent(data.kpis.handoffRate)}
                                helper="Percentual de atendimentos que precisaram escalar."
                                icon={<TrendingUp className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Tempo medio"
                                value={`${data.kpis.avgResponseTimeMs} ms`}
                                helper={`${data.kpis.uniqueSessions} sessoes unicas no periodo.`}
                                icon={<TimerReset className="h-5 w-5" />}
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Sugestões ao Humano"
                        description="Monitoramento da engine supervisionada (Assisted Mode)."
                    >
                        <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-4">
                            <MetricCard
                                title="Sugestões Geradas"
                                value={String(data.kpis.suggestionsGenerated)}
                                helper="Total de sugestões ofertadas."
                                icon={<Sparkles className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Taxa de Aprovação"
                                value={formatPercent(data.kpis.suggestionsGenerated > 0 ? (data.kpis.suggestionsApproved / data.kpis.suggestionsGenerated) * 100 : 0)}
                                helper="Aprovadas sem edição."
                                icon={<Check className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Taxa de Edição"
                                value={formatPercent(data.kpis.suggestionsGenerated > 0 ? (data.kpis.suggestionsEdited / data.kpis.suggestionsGenerated) * 100 : 0)}
                                helper="Aprovadas com modificação."
                                icon={<Pencil className="h-5 w-5" />}
                            />
                            <MetricCard
                                title="Taxa de Rejeição"
                                value={formatPercent(data.kpis.suggestionsGenerated > 0 ? (data.kpis.suggestionsRejected / data.kpis.suggestionsGenerated) * 100 : 0)}
                                helper="Sugestões ignoradas / apagadas."
                                icon={<X className="h-5 w-5" />}
                            />
                        </div>
                    </SettingsSection>

                    <SettingsSection
                        title="Volume assistido"
                        description={`Buckets em ${data.range.granularity === 'week' ? 'semanas' : 'dias'} para mostrar tendencia operacional sem expor payload bruto.`}
                    >
                        <VolumeChart data={data.volume} />
                    </SettingsSection>
                </>
            ) : null}
        </SettingsPage>
    );
}
