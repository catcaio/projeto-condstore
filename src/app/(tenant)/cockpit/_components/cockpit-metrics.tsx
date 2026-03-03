'use client';

import { useEffect, useState, useRef } from 'react';
import { MetricCard } from './metric-card';

interface CockpitMetricsData {
    flowStarted: number;
    cepProvided: number;
    quantityProvided: number;
    freightQuoted: number;
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
                const res = await fetch('/api/cockpit/metrics/funnel', { signal });

                if (!res.ok) throw new Error('Failed to fetch metrics');

                const json = await res.json();

                if (isMounted.current) {
                    setData({
                        flowStarted: json.window_7d?.counts?.flow_started || 0,
                        cepProvided: json.window_7d?.counts?.cep_provided || 0,
                        quantityProvided: json.window_7d?.counts?.quantity_provided || 0,
                        freightQuoted: json.window_7d?.counts?.freight_quoted || 0,
                    });
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

    if (!loading && !error && (!data || (data.flowStarted === 0 && data.freightQuoted === 0))) {
        return (
            <div className="grid grid-cols-1 gap-6">
                <div className="p-6 rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] text-[hsl(var(--cockpit-text-muted))]">
                    Nenhum evento de funil registrado.
                </div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                title="Flows Iniciados"
                value={data?.flowStarted ?? 0}
                isLoading={loading}
                subtext="Total de interações (7d)"
            />
            <MetricCard
                title="CEP Informado"
                value={data?.cepProvided ?? 0}
                isLoading={loading}
                subtext="Passos de CEP (7d)"
            />
            <MetricCard
                title="Qtd Informada"
                value={data?.quantityProvided ?? 0}
                isLoading={loading}
                subtext="Passos de quantidade (7d)"
            />
            <MetricCard
                title="Cotações de Frete"
                value={data?.freightQuoted ?? 0}
                isLoading={loading}
                subtext="Cotações finalizadas (7d)"
            />
        </div>
    );
}
