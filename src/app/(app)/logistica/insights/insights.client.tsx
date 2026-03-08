'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { BarChart3, MapPin, Truck, TrendingUp, Route } from 'lucide-react';

interface InsightsData {
    topCeps: { cep: string; count: number }[];
    topCarriers: { carrier: string; count: number }[];
    avgDelta: number | null;
    deltaCount: number;
    totalSimulations: number;
    totalConfirmations: number;
    topRoutes: { cepPrefix: string; carrier: string; count: number }[];
}

function StatCard({ icon: Icon, label, value, sub }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[hsl(var(--ui-text-muted))]">
                <Icon className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--ui-text))] tabular-nums">{value}</p>
            {sub && <p className="text-xs text-[hsl(var(--ui-text-muted))]">{sub}</p>}
        </div>
    );
}

function RankList({ items, getLabel, getValue, colorFn }: {
    items: any[];
    getLabel: (item: any) => string;
    getValue: (item: any) => number;
    colorFn?: (idx: number) => string;
}) {
    const max = items[0] ? getValue(items[0]) : 1;
    return (
        <ul className="flex flex-col gap-2">
            {items.map((item, i) => {
                const val = getValue(item);
                const pct = max > 0 ? Math.round((val / max) * 100) : 0;
                const barColor = colorFn ? colorFn(i) : 'bg-[hsl(var(--ui-accent-blue))]';
                return (
                    <li key={i} className="flex items-center gap-3">
                        <span className="text-[10px] font-bold text-[hsl(var(--ui-text-muted))] w-5 text-right shrink-0">
                            {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                                <span className="text-xs font-medium text-[hsl(var(--ui-text))] truncate">
                                    {getLabel(item)}
                                </span>
                                <span className="text-xs tabular-nums font-semibold text-[hsl(var(--ui-text))] shrink-0">
                                    {val}
                                </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[hsl(var(--ui-border))] overflow-hidden">
                                <div
                                    className={`h-full rounded-full transition-all ${barColor}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                        </div>
                    </li>
                );
            })}
        </ul>
    );
}

export function InsightsClient() {
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const res = await safeFetch('/api/freight/insights');
            const json = await res.json();
            if (json.ok) {
                setData(json.data);
            } else {
                setError('Falha ao carregar insights');
            }
        } catch {
            setError('Erro de conexão');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
            </div>
        );
    }

    if (error || !data) {
        return <div className="p-8 text-center text-sm text-red-500">{error ?? 'Sem dados'}</div>;
    }

    const avgDeltaLabel = data.avgDelta !== null
        ? `${data.avgDelta >= 0 ? '+' : ''}R$ ${data.avgDelta.toFixed(2)}`
        : '—';

    const avgDeltaNote = data.deltaCount > 0
        ? `Baseado em ${data.deltaCount} confirmação(ões)`
        : 'Sem confirmações ainda';

    return (
        <div className="max-w-[1100px] mx-auto flex flex-col gap-8">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Insights de Frete
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Inteligência logística baseada em simulações e confirmações de frete
                </p>
            </div>

            {/* Top stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    icon={Route}
                    label="Simulações"
                    value={data.totalSimulations}
                    sub="No histórico recente"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Confirmações"
                    value={data.totalConfirmations}
                    sub="Fretes concluídos"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Delta Médio"
                    value={avgDeltaLabel}
                    sub={avgDeltaNote}
                />
                <StatCard
                    icon={Truck}
                    label="Transportadoras"
                    value={data.topCarriers.length}
                    sub="Com histórico de uso"
                />
            </div>

            {/* Content grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Top CEPs */}
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                        <h2 className="text-sm font-semibold text-[hsl(var(--ui-text))]">CEPs Mais Cotados</h2>
                    </div>
                    {data.topCeps.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem dados ainda</p>
                    ) : (
                        <RankList
                            items={data.topCeps}
                            getLabel={(i) => i.cep}
                            getValue={(i) => i.count}
                            colorFn={() => 'bg-blue-500'}
                        />
                    )}
                </div>

                {/* Top Carriers */}
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 flex flex-col gap-4">
                    <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                        <h2 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Transportadoras Mais Usadas</h2>
                    </div>
                    {data.topCarriers.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem dados ainda</p>
                    ) : (
                        <RankList
                            items={data.topCarriers}
                            getLabel={(i) => i.carrier}
                            getValue={(i) => i.count}
                            colorFn={(idx) => ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500'][idx % 4]}
                        />
                    )}
                </div>

                {/* Top Routes */}
                <div className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 flex flex-col gap-4 md:col-span-2">
                    <div className="flex items-center gap-2">
                        <Route className="w-4 h-4 text-[hsl(var(--ui-text-muted))]" />
                        <h2 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Top Rotas (CEP Prefixo → Transportadora)</h2>
                    </div>
                    {data.topRoutes.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem dados ainda</p>
                    ) : (
                        <RankList
                            items={data.topRoutes}
                            getLabel={(i) => `${i.cepPrefix}XXXXX → ${i.carrier}`}
                            getValue={(i) => i.count}
                            colorFn={(idx) => ['bg-violet-500', 'bg-purple-500', 'bg-indigo-500', 'bg-blue-500', 'bg-sky-500'][idx % 5]}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
