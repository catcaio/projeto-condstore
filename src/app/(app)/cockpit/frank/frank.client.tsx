'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCcw, TrendingUp, Wrench, ArrowRightLeft, TimerReset } from 'lucide-react';
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
            <div className="grid gap-6 xl:grid-cols-3">
                {Array.from({ length: 3 }).map((_, index) => (
                    <div
                        key={index}
                        className="h-64 animate-pulse rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))]"
                    />
                ))}
            </div>
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const queryString = searchParams.toString();

    async function loadData() {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/cockpit/metrics/frank?${queryString}`, {
                cache: 'no-store',
            });
            const json = await response.json();

            if (!response.ok || !json?.ok || !json?.data) {
                throw new Error('Nao foi possivel carregar as metricas do Frank assistente.');
            }

            setData(json.data);
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

    const isEmpty = !loading && !error && data?.kpis.totalInteractions === 0;

    return (
        <SettingsPage
            title="Frank Assistente"
            description="Observabilidade operacional do atendimento assistido, com foco em handoffs, tools read-only e qualidade de resposta."
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
                searchPlaceholder="Buscar por intencao, tool ou motivo de fallback..."
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
                        <select
                            className="h-10 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-3 text-sm text-[hsl(var(--ui-text))]"
                            value={filters.outcome || 'all'}
                            onChange={(event) => updateFilter('outcome', event.target.value)}
                        >
                            <option value="all" className="bg-[hsl(var(--ui-surface))]">Todos os outcomes</option>
                            <option value="success" className="bg-[hsl(var(--ui-surface))]">Success</option>
                            <option value="fallback" className="bg-[hsl(var(--ui-surface))]">Fallback</option>
                            <option value="handoff" className="bg-[hsl(var(--ui-surface))]">Handoff</option>
                        </select>
                    </div>
                )}
                drawerContent={(localFilters, setLocalFilters) => (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Tenant</label>
                            <input
                                disabled
                                className="h-10 w-full rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] px-3 text-sm text-[hsl(var(--ui-text-muted))]"
                                value={data?.tenantId ?? 'Tenant atual'}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Intenção</label>
                            <input
                                className="h-10 w-full rounded-md border border-[hsl(var(--ui-border))] bg-transparent px-3 text-sm text-[hsl(var(--ui-text))]"
                                placeholder="Ex.: ORDER_STATUS"
                                value={localFilters.intent || ''}
                                onChange={(event) => setLocalFilters({ ...localFilters, intent: event.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data inicial</label>
                                <input
                                    type="date"
                                    className="h-10 w-full rounded-md border border-[hsl(var(--ui-border))] bg-transparent px-3 text-sm text-[hsl(var(--ui-text))]"
                                    value={localFilters.dateStart || ''}
                                    onChange={(event) => setLocalFilters({ ...localFilters, dateStart: event.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data final</label>
                                <input
                                    type="date"
                                    className="h-10 w-full rounded-md border border-[hsl(var(--ui-border))] bg-transparent px-3 text-sm text-[hsl(var(--ui-text))]"
                                    value={localFilters.dateEnd || ''}
                                    onChange={(event) => setLocalFilters({ ...localFilters, dateEnd: event.target.value })}
                                />
                            </div>
                        </div>
                    </>
                )}
            />

            {loading && !data ? <LoadingSkeleton /> : null}
            {!loading && error ? <ErrorState message={error} /> : null}
            {isEmpty ? (
                <EmptyState
                    title="Ainda nao ha dados suficientes do Frank assistente"
                    description="Assim que o atendimento assistido gerar interacoes em operational_events, este painel vai exibir volume, handoffs, tools e motivos de fallback por tenant."
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
                        title="Volume assistido"
                        description={`Buckets em ${data.range.granularity === 'week' ? 'semanas' : 'dias'} para mostrar tendencia operacional sem expor payload bruto.`}
                    >
                        <VolumeChart data={data.volume} />
                    </SettingsSection>

                    <div className="grid gap-6 xl:grid-cols-3">
                        <SettingsSection
                            title="Intenções mais frequentes"
                            description="Quais perguntas chegam com mais recorrencia ao assistente."
                        >
                            <MetricTable
                                title="Top intenções"
                                description="Distribuicao por intent resolvida."
                                headers={['Intent', 'Volume', 'Share']}
                                rows={data.intents.map((item) => [
                                    <Badge key={`${item.key}-badge`} variant="muted">{item.key}</Badge>,
                                    <span key={`${item.key}-count`}>{item.count}</span>,
                                    <span key={`${item.key}-share`}>{formatPercent(item.share)}</span>,
                                ])}
                                emptyLabel="Nenhuma intencao agregada no periodo atual."
                            />
                        </SettingsSection>

                        <SettingsSection
                            title="Tools read-only"
                            description="Quais consultas o Frank mais aciona e qual taxa de sucesso cada uma sustenta."
                        >
                            <MetricTable
                                title="Uso e sucesso por tool"
                                description="Somente tools de consulta em assistant mode."
                                headers={['Tool', 'Volume', 'Sucesso', 'Fallback']}
                                rows={data.tools.map((tool) => [
                                    <div key={`${tool.toolUsed}-tool`} className="space-y-1">
                                        <div className="font-medium">{tool.toolUsed}</div>
                                        <div className="text-xs text-[hsl(var(--ui-text-muted))]">
                                            Taxa de sucesso {formatPercent(tool.successRate)}
                                        </div>
                                    </div>,
                                    <span key={`${tool.toolUsed}-total`}>{tool.total}</span>,
                                    <span key={`${tool.toolUsed}-success`}>{tool.successCount}</span>,
                                    <span key={`${tool.toolUsed}-fallback`}>{tool.fallbackCount}</span>,
                                ])}
                                emptyLabel="Nenhuma tool foi usada no recorte filtrado."
                            />
                        </SettingsSection>

                        <SettingsSection
                            title="Motivos de fallback"
                            description="Onde o Frank deixa de responder com confianca suficiente."
                        >
                            <MetricTable
                                title="Fallback reasons"
                                description="Motivos agregados sem PII."
                                headers={['Razao', 'Volume', 'Share']}
                                rows={data.fallbackReasons.map((reason) => [
                                    <Badge key={`${reason.key}-badge`} variant="default">{reason.key}</Badge>,
                                    <span key={`${reason.key}-count`}>{reason.count}</span>,
                                    <span key={`${reason.key}-share`}>{formatPercent(reason.share)}</span>,
                                ])}
                                emptyLabel="Nenhum motivo de fallback agregado no periodo."
                            />
                        </SettingsSection>
                    </div>

                    <div className="grid gap-6 xl:grid-cols-2">
                        <SettingsSection
                            title="Sessoes com mais interacoes"
                            description="Ranking anonimo para identificar concentracao operacional sem expor telefone ou hash."
                        >
                            <MetricTable
                                title="Sessoes anonimizadas"
                                description="Top sessoes por volume assistido."
                                headers={['Sessao', 'Interacoes', 'Ultima atividade']}
                                rows={data.sessions.map((session) => [
                                    <span key={`${session.label}-label`} className="font-medium">{session.label}</span>,
                                    <span key={`${session.label}-count`}>{session.interactions}</span>,
                                    <span key={`${session.label}-date`}>{formatDateTime(session.lastInteractionAt)}</span>,
                                ])}
                                emptyLabel="Nenhuma sessao suficiente para ranking neste recorte."
                            />
                        </SettingsSection>

                        <SettingsSection
                            title="Fonte e privacidade"
                            description="Contrato operacional usado pelo painel."
                        >
                            <div className="space-y-4 p-4">
                                <div className="rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg-subtle))] p-4">
                                    <div className="text-sm font-semibold text-[hsl(var(--ui-text))]">
                                        Fonte primaria: {data.sourceSummary.primarySource}
                                    </div>
                                    <div className="mt-1 text-xs text-[hsl(var(--ui-text-muted))]">
                                        Tenant atual: {data.tenantId}
                                    </div>
                                </div>
                                <ul className="space-y-2 text-sm text-[hsl(var(--ui-text-muted))]">
                                    {data.sourceSummary.notes.map((note) => (
                                        <li key={note} className="rounded-lg border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg))] px-3 py-2">
                                            {note}
                                        </li>
                                    ))}
                                </ul>
                                <div className="text-xs text-[hsl(var(--ui-text-muted))]">
                                    Gerado em {formatDateTime(data.generatedAt)}.
                                </div>
                            </div>
                        </SettingsSection>
                    </div>
                </>
            ) : null}
        </SettingsPage>
    );
}
