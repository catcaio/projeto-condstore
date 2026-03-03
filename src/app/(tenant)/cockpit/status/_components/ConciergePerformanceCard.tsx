'use client';

import { useEffect, useState, useCallback } from 'react';

interface ConciergeStats {
    totalDecisions: number;
    avgScore: number;
    tradeoffPct: number;
    lastEventAt: string | null;
}

/**
 * Cockpit card showing Concierge performance metrics (24h).
 * Reads from public_events via internal API.
 */
export function ConciergePerformanceCard({ tenantId }: { tenantId: string }) {
    const [stats, setStats] = useState<ConciergeStats | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/cockpit/concierge-stats`);
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch {
            // Silently fail — card shows "Aguardando eventos"
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    if (loading) {
        return (
            <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-5 backdrop-blur-sm animate-pulse">
                <div className="h-4 w-40 bg-zinc-700 rounded mb-4" />
                <div className="grid grid-cols-2 gap-3">
                    <div className="h-16 bg-zinc-700/50 rounded-lg" />
                    <div className="h-16 bg-zinc-700/50 rounded-lg" />
                    <div className="h-16 bg-zinc-700/50 rounded-lg" />
                    <div className="h-16 bg-zinc-700/50 rounded-lg" />
                </div>
            </div>
        );
    }

    const hasData = stats && stats.totalDecisions > 0;

    return (
        <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-zinc-200 tracking-tight">
                    Concierge Performance (24h)
                </h3>
                <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Ativo
                </span>
            </div>

            {!hasData ? (
                <div className="text-sm text-zinc-500 py-6 text-center bg-zinc-900/40 rounded-lg">
                    Aguardando eventos de decisão.
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-zinc-900/40 rounded-lg px-3 py-3">
                        <p className="text-zinc-500 text-xs">Total Decisões</p>
                        <p className="text-2xl font-black text-zinc-100 mt-1">
                            {stats.totalDecisions}
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 rounded-lg px-3 py-3">
                        <p className="text-zinc-500 text-xs">Score Médio</p>
                        <p className="text-2xl font-black text-emerald-400 mt-1">
                            {stats.avgScore.toFixed(2)}
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 rounded-lg px-3 py-3">
                        <p className="text-zinc-500 text-xs">Com Tradeoff</p>
                        <p className="text-2xl font-black text-amber-400 mt-1">
                            {stats.tradeoffPct.toFixed(0)}%
                        </p>
                    </div>
                    <div className="bg-zinc-900/40 rounded-lg px-3 py-3">
                        <p className="text-zinc-500 text-xs">Último Evento</p>
                        <p className="text-xs font-medium text-zinc-300 mt-1.5">
                            {stats.lastEventAt
                                ? new Date(stats.lastEventAt).toLocaleString()
                                : 'N/A'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
