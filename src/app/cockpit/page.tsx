'use client';

import { useState, useEffect, useCallback } from 'react';

interface MetricsData {
    totalMessages: number;
    totalSimulations: number;
    messagesToday: number;
    simulationsToday: number;
    intentsBreakdownToday: Record<string, number>;
    intentsBreakdownTotal: Record<string, number>;
}

const INTENT_LABELS: Record<string, string> = {
    quote_request: '📦 Cotação',
    price_question: '💰 Preço',
    order: '🛒 Pedido',
    unknown: '❓ Outros',
};

function IntentBadge({ intent, count }: { intent: string; count: number }) {
    const label = INTENT_LABELS[intent] || intent;
    const colors: Record<string, string> = {
        quote_request: 'bg-blue-50 text-blue-700 border-blue-200',
        price_question: 'bg-amber-50 text-amber-700 border-amber-200',
        order: 'bg-green-50 text-green-700 border-green-200',
        unknown: 'bg-slate-50 text-slate-600 border-slate-200',
    };
    const color = colors[intent] || colors.unknown;

    return (
        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border ${color}`}>
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-lg font-bold">{count}</span>
        </div>
    );
}

function StatCard({ title, value, subtitle }: { title: string; value: number; subtitle?: string }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</span>
            <span className="text-3xl font-bold text-slate-900">{value.toLocaleString('pt-BR')}</span>
            {subtitle && <span className="text-xs text-slate-500 mt-1">{subtitle}</span>}
        </div>
    );
}

export default function CockpitPage() {
    const [data, setData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            const res = await fetch('/api/metrics/overview');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const json: MetricsData = await res.json();
            setData(json);
            setError('');
            setLastUpdate(new Date());
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erro ao carregar métricas');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 10_000);
        return () => clearInterval(interval);
    }, [fetchMetrics]);

    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            {/* Header */}
            <header className="bg-white border-b border-slate-200">
                <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">🎛️ Cockpit</h1>
                        <p className="text-slate-500 text-sm">Métricas em tempo real</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {lastUpdate && (
                            <span className="text-xs text-slate-400">
                                Atualizado: {lastUpdate.toLocaleTimeString('pt-BR')}
                            </span>
                        )}
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-[10px] font-bold text-green-600 border border-green-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            LIVE
                        </span>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Loading */}
                {loading && !data && (
                    <div className="flex items-center justify-center h-64 text-slate-400">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm">Carregando métricas...</p>
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-red-700 text-sm font-medium">
                        ⚠️ {error}
                    </div>
                )}

                {data && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        {/* Metric Cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <StatCard title="Mensagens Total" value={data.totalMessages} />
                            <StatCard title="Mensagens Hoje" value={data.messagesToday} />
                            <StatCard title="Simulações Total" value={data.totalSimulations} />
                            <StatCard title="Simulações Hoje" value={data.simulationsToday} />
                        </div>

                        {/* Intent Breakdowns */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Today */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                                    🕐 Intents Hoje
                                </h2>
                                <div className="space-y-2">
                                    {Object.keys(data.intentsBreakdownToday).length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">Nenhum registro hoje</p>
                                    ) : (
                                        Object.entries(data.intentsBreakdownToday)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([intent, count]) => (
                                                <IntentBadge key={intent} intent={intent} count={count} />
                                            ))
                                    )}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                                    📊 Intents Total
                                </h2>
                                <div className="space-y-2">
                                    {Object.keys(data.intentsBreakdownTotal).length === 0 ? (
                                        <p className="text-sm text-slate-400 text-center py-4">Nenhum registro</p>
                                    ) : (
                                        Object.entries(data.intentsBreakdownTotal)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([intent, count]) => (
                                                <IntentBadge key={intent} intent={intent} count={count} />
                                            ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
