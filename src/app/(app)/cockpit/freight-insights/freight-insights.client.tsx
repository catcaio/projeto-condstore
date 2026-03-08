'use client';

import { useState, useEffect, useCallback } from 'react';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { BarChart3, TrendingUp, TrendingDown, MapPin, Truck, AlertTriangle } from 'lucide-react';

interface InsightsData {
    topCepPrefixes: { cepPrefix: string; count: number }[];
    topCarriers: { carrierName: string; count: number }[];
    avgDeltaByCarrier: { carrierName: string; avgDelta: string; count: number }[];
    zoneDivergence: { zoneCode: string; carrierName: string; avgDelta: string; avgConfirmedFreight: string; confirmationsCount: number; confidenceScore: string }[];
}

export function FreightInsightsClient() {
    const [data, setData] = useState<InsightsData | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await safeFetch('/api/internal/freight/insights');
            const json = await res.json();
            if (json.ok) setData(json.data);
        } catch { /* noop */ } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center p-16">
                <div className="w-7 h-7 rounded-full border-[3px] border-[hsl(var(--ui-accent-blue)/0.2)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
            </div>
        );
    }

    if (!data) {
        return <p className="text-sm text-[hsl(var(--ui-text-muted))] italic p-4">Sem dados de inteligência disponíveis</p>;
    }

    return (
        <div className="max-w-[1100px] mx-auto flex flex-col gap-6">
            <div>
                <h1 className="text-xl font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" /> Inteligência de Frete
                </h1>
                <p className="text-sm text-[hsl(var(--ui-text-muted))] mt-0.5">
                    Análise de desempenho e padrões de frete
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Panel 1: Most repeated CEP prefixes */}
                <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5" /> CEP Mais Frequentes
                    </h2>
                    {data.topCepPrefixes.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem dados</p>
                    ) : (
                        <div className="space-y-1.5">
                            {data.topCepPrefixes.map((c, i) => {
                                const maxCount = data.topCepPrefixes[0]?.count || 1;
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs font-mono font-semibold text-[hsl(var(--ui-text))] w-14">{c.cepPrefix}</span>
                                        <div className="flex-1 h-5 bg-[hsl(var(--ui-bg))] rounded overflow-hidden">
                                            <div className="h-full bg-[hsl(var(--ui-accent-blue)/0.2)] rounded transition-all" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                                        </div>
                                        <span className="text-[10px] tabular-nums text-[hsl(var(--ui-text-muted))] w-8 text-right">{c.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Panel 2: Top carriers by confirmation */}
                <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" /> Top Transportadoras (Confirmações)
                    </h2>
                    {data.topCarriers.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem confirmações</p>
                    ) : (
                        <div className="space-y-1.5">
                            {data.topCarriers.map((c, i) => {
                                const maxCount = data.topCarriers[0]?.count || 1;
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-[hsl(var(--ui-text))] w-20 truncate">{c.carrierName}</span>
                                        <div className="flex-1 h-5 bg-[hsl(var(--ui-bg))] rounded overflow-hidden">
                                            <div className="h-full bg-emerald-500/20 rounded transition-all" style={{ width: `${(c.count / maxCount) * 100}%` }} />
                                        </div>
                                        <span className="text-[10px] tabular-nums text-[hsl(var(--ui-text-muted))] w-8 text-right">{c.count}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Panel 3: Average delta by carrier */}
                <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                        <TrendingUp className="w-3.5 h-3.5" /> Delta Médio por Transportadora
                    </h2>
                    {data.avgDeltaByCarrier.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem dados</p>
                    ) : (
                        <div className="divide-y divide-[hsl(var(--ui-border)/0.3)]">
                            {data.avgDeltaByCarrier.map((c, i) => {
                                const delta = parseFloat(c.avgDelta) || 0;
                                return (
                                    <div key={i} className="flex items-center justify-between py-2">
                                        <span className="text-xs font-medium text-[hsl(var(--ui-text))]">{c.carrierName}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] tabular-nums text-[hsl(var(--ui-text-muted))]">{c.count} conf.</span>
                                            <span className={`text-xs font-semibold tabular-nums flex items-center gap-0.5 ${delta > 0 ? 'text-red-500' : delta < 0 ? 'text-emerald-500' : 'text-[hsl(var(--ui-text-muted))]'}`}>
                                                {delta > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                R$ {Math.abs(delta).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* Panel 4: Zones with largest price divergence */}
                <section className="rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 space-y-3">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))] flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5" /> Zonas com Maior Divergência
                    </h2>
                    {data.zoneDivergence.length === 0 ? (
                        <p className="text-xs text-[hsl(var(--ui-text-muted))] italic">Sem divergências</p>
                    ) : (
                        <div className="divide-y divide-[hsl(var(--ui-border)/0.3)]">
                            {data.zoneDivergence.map((z, i) => {
                                const delta = parseFloat(z.avgDelta) || 0;
                                const freight = parseFloat(z.avgConfirmedFreight) || 0;
                                const isAnomaly = freight > 0 && Math.abs(delta / freight) > 0.4;
                                return (
                                    <div key={i} className="flex items-center justify-between py-2">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-semibold text-[hsl(var(--ui-text))]">{z.zoneCode || '—'}</span>
                                            <span className="text-[10px] text-[hsl(var(--ui-text-muted))]">{z.carrierName}</span>
                                            {isAnomaly && <span className="text-[9px] font-semibold text-red-500 bg-red-500/10 px-1 py-0.5 rounded">ANOMALIA</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs tabular-nums">
                                            <span className="text-[hsl(var(--ui-text-muted))]">R$ {freight.toFixed(2)}</span>
                                            <span className={`font-semibold ${delta > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                                Δ R$ {Math.abs(delta).toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
