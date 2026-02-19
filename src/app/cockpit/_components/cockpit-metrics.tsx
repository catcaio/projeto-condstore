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
                // Fetch from new freight metrics endpoint
                const res = await fetch('/api/metrics/freight?tenantId=default-tenant', { signal }); // Hardcoded tenant for now as per plan/API

                if (!res.ok) throw new Error('Failed to fetch metrics');

                const json = await res.json();

                if (isMounted.current) {
                    setData({
                        // Mapping new API response to component state (simplifying for now or we can expand state)
                        // Actually, let's just use the props we need.
                        // We need to update the interface first? 
                        // Let's cast for now to avoid breaking the file completely in one go, 
                        // but really we should update the interface.
                        mensagensHoje: json.totalQuotes || 0, // Placeholder mapping
                        cotacoesHoje: json.quotesToday || 0,
                        pedidosHoje: json.quotesThisMonth || 0, // Using this month as "pedidos" slot for now? Or just map correctly.
                        erros24h: 0,
                        // Extra fields
                        avgFreight: json.avgFreight,
                        topCarrier: json.topCarriers?.[0]?.carrier || 'N/A',
                        avgDuration: json.avgDurationMs
                    } as any);
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

    // Cast data to include new fields
    const m = data as any;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
                title="Cotações Hoje"
                value={m?.cotacoesHoje ?? 0}
                isLoading={loading}
                subtext="Total de cotações hoje"
            />
            <MetricCard
                title="Cotações Mês"
                value={m?.pedidosHoje ?? 0}
                isLoading={loading}
                subtext="Total este mês"
            />
            <MetricCard
                title="Ticket Médio"
                value={`R$ ${m?.avgFreight?.toFixed(2) ?? '0.00'}`}
                isLoading={loading}
                subtext="Média de valor de frete"
            />
            <MetricCard
                title="Top Transportadora"
                value={m?.topCarrier ?? 'N/A'}
                isLoading={loading}
                subtext="Mais utilizada"
            />
        </div>
    );
}
