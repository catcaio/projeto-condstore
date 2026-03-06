"use client";

import { useEffect, useState } from "react";
import { SettingsPage, SettingsSection } from "@/ui/settings";
import { Card } from "@/ui/components/card";
import { Badge } from "@/ui/components/badge";
import Link from "next/link";
import { Activity, LayoutDashboard, Target, ExternalLink, Network, AlignEndHorizontal } from "lucide-react";
import type { TenantBenchmarkData } from "@/lib/supreme/benchmark-engine";

export default function BenchmarksPage() {
    const [data, setData] = useState<TenantBenchmarkData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    async function getTenantId(): Promise<string> {
        const res = await fetch("/api/internal/me").catch(() => null);
        if (res?.ok) { const j = await res.json(); return j?.tenantId ?? "unknown"; }
        return "unknown";
    }

    async function loadData() {
        setLoading(true);
        setError("");
        try {
            const tid = await getTenantId();
            const res = await fetch(`/api/internal/tenants/${tid}/supreme/benchmarks`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json = await res.json();
            setData(json.data ?? { segmentKey: 'none', metrics: [] });
        } catch (err: any) { setError(err.message); }
        finally { setLoading(false); }
    }

    useEffect(() => { loadData(); }, []);

    const headerAction = (
        <div className="flex items-center gap-2">
            <Link href="/cockpit/supreme" className="text-xs text-[hsl(var(--ui-accent-blue))] font-medium hover:underline flex items-center gap-1">
                &larr; Voltar para Findings
            </Link>
        </div>
    );

    function formatValue(metric: string, val: number | null) {
        if (val === null) return "--";
        if (metric.includes('rate')) return `${Math.round(val * 100)}%`;
        if (metric === 'avg_response_time_ms') return `${Math.round(val / 60000)} min`;
        return val.toString();
    }

    function renderLabel(label: string) {
        if (label === 'below_baseline') return <Badge variant="danger">Abaixo da Linha Base (ALERTA)</Badge>;
        if (label === 'median_band') return <Badge variant="muted">Na Média de Mercado</Badge>;
        if (label === 'top_quartile') return <Badge variant="success">Grupo de Elite (Top 25%)</Badge>;
        return <Badge variant="muted">Desconhecido</Badge>;
    }

    return (
        <SettingsPage
            title="Benchmarks Anônimos de Mercado"
            description="Compare o desempenho da sua operação com lojistas do mesmo segmento de forma segura."
            headerAction={headerAction}
        >
            {loading && <div className="text-sm text-[hsl(var(--ui-text-muted))] animate-pulse">Analizando dados do mercado...</div>}
            {error && <div className="text-red-500 text-sm">Erro ao carregar benchmarks: {error}</div>}

            {!loading && !error && data && (
                <div className="space-y-6">
                    <div className="flex items-center gap-3 p-4 bg-[hsl(var(--ui-bg-subtle))] border border-[hsl(var(--ui-border))] rounded-lg">
                        <Network className="w-5 h-5 text-indigo-500" />
                        <div>
                            <h3 className="text-sm font-semibold text-[hsl(var(--ui-text))]">Cluster Designado: <span className="font-mono text-indigo-500 bg-indigo-500/10 px-1 py-0.5 rounded">{data.segmentKey.toUpperCase()}</span></h3>
                            <p className="text-xs text-[hsl(var(--ui-text-muted))]">Todos os comparativos abaixo são em relação aos tenants deste mesmo grupo.</p>
                        </div>
                    </div>

                    <SettingsSection title="Métricas Comparativas">
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {data.metrics.length === 0 && (
                                <div className="col-span-full p-4 text-sm text-[hsl(var(--ui-text-muted))] border border-dashed border-[hsl(var(--ui-border))] rounded text-center">
                                    Ainda não há dados suficientes no seu segmento (min: 3 lojistas) para liberar o benchmarking publicamente com privacidade.
                                </div>
                            )}

                            {data.metrics.map((m, idx) => (
                                <Card key={idx} className="p-4 flex flex-col justify-between border-t-2 border-t-[hsl(var(--ui-border))]">

                                    <div className="mb-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">
                                                Amostra: {m.sampleSize} Lojas
                                            </span>
                                            {renderLabel(m.positionLabel)}
                                        </div>

                                        <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                                            <AlignEndHorizontal className="w-4 h-4 text-zinc-500" />
                                            {m.metric}
                                        </h3>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2 p-3 bg-[hsl(var(--ui-bg-subtle))] rounded border border-[hsl(var(--ui-border))]">
                                            <div className="text-center">
                                                <div className="text-[10px] text-[hsl(var(--ui-text-muted))] mb-0.5 uppercase tracking-wide">Mercado Inferior (p25)</div>
                                                <div className="text-xs font-mono font-medium">{formatValue(m.metric, m.p25)}</div>
                                            </div>
                                            <div className="text-center border-l border-r border-[hsl(var(--ui-border))]">
                                                <div className="text-[10px] text-[hsl(var(--ui-text))] font-bold mb-0.5 uppercase tracking-wide">Sua Loja</div>
                                                <div className="text-sm font-mono font-bold text-indigo-400">{formatValue(m.metric, m.tenantValue)}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-[10px] text-[hsl(var(--ui-text-muted))] mb-0.5 uppercase tracking-wide">Mercado Superior (p75)</div>
                                                <div className="text-xs font-mono font-medium">{formatValue(m.metric, m.p75)}</div>
                                            </div>
                                        </div>

                                    </div>
                                </Card>
                            ))}
                        </div>
                    </SettingsSection>
                </div>
            )}
        </SettingsPage>
    );
}
