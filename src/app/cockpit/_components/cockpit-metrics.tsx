'use client';

import { useEffect, useState, useRef } from 'react';
import { MetricCard } from './metric-card';

interface CockpitMetricsData {
    mensagensHoje: number;
    cotacoesHoje: number;
    pedidosHoje: number;
    erros24h: number;
}

const POLL_INTERVAL_MS = 30000; // 30s

export function CockpitMetrics() {
    const [data, setData] = useState<CockpitMetricsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Use ref to track mounted state to prevent state updates after unmount
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;

        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchMetrics() {
            try {
                // Determine header injection base URL if needed, but relative path is fine for same-origin
                const res = await fetch('/api/cockpit/metrics', { signal });

                if (!res.ok) throw new Error('Failed to fetch metrics');

                const json = await res.json();

                if (isMounted.current) {
                    setData(json);
                    setLoading(false);
                    setError(false);
                }
            } catch (err) {
                if (err instanceof Error && err.name === 'AbortError') {
                    return; // Ignore aborts
                }
                if (isMounted.current) {
                    console.error('Metrics fetch error:', err);
                    setError(true);
                    setLoading(false);
                }
            }
        }

        // Initial fetch
        fetchMetrics();

        // Setup polling
        const intervalId = setInterval(fetchMetrics, POLL_INTERVAL_MS);

        // Cleanup
        return () => {
            isMounted.current = false;
            controller.abort(); // Cancel any pending fetch
            clearInterval(intervalId); // Stop polling
        };
    }, []);

    if (error) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="p-6 rounded-lg border border-red-500/20 bg-red-500/10 text-red-500 col-span-full">
                    Erro ao carregar métricas. O sistema tentará novamente em breve.
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                title="Mensagens Hoje"
                value={data?.mensagensHoje ?? 0}
                isLoading={loading}
                subtext="Total de mensagens processadas"
            />
            <MetricCard
                title="Cotações Hoje"
                value={data?.cotacoesHoje ?? 0}
                isLoading={loading}
                subtext="Cotações de frete geradas"
            />
            <MetricCard
                title="Pedidos Hoje"
                value={data?.pedidosHoje ?? 0}
                isLoading={loading}
                subtext="Pedidos finalizados"
            />
            <MetricCard
                title="Erros (24h)"
                value={data?.erros24h ?? 0}
                isLoading={loading}
                className={data?.erros24h ? "border-red-500/50" : ""}
                subtext="Erros críticos registrados"
            />
        </div>
    );
}
