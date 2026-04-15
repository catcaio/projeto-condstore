'use client';

import { useState, useCallback } from 'react';
import useSWR from 'swr';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { CockpitOverviewBlock } from './CockpitOverviewBlock';
import { CockpitFunnelBlock } from './CockpitFunnelBlock';
import { CockpitAttributionBlock } from './CockpitAttributionBlock';
import { CockpitFreightBlock } from './CockpitFreightBlock';

export type GroupByFilter = 'utm_source' | 'utm_campaign' | 'none';

interface CockpitDashboardProps {
    tenantId?: string;
}

const fetcher = (url: string) => safeFetch(url).then(res => res.ok ? res.json() : Promise.reject(new Error('Fetch failed')));

export function CockpitOperationalDashboard({ tenantId }: CockpitDashboardProps) {
    const [groupBy, setGroupBy] = useState<GroupByFilter>('utm_campaign');
    
    const params = new URLSearchParams();
    if (groupBy !== 'none') params.set('groupBy', groupBy);
    if (tenantId) params.set('tenantId', tenantId);
    const qs = params.toString() ? `?${params.toString()}` : '';

    const { data: metrics, error: metricsError, isLoading: metricsLoading, mutate: mutateMetrics } = useSWR(`/api/cockpit/metrics${qs}`, fetcher, { refreshInterval: 60000 });
    const { data: funnel, error: funnelError, isLoading: funnelLoading, mutate: mutateFunnel } = useSWR(`/api/cockpit/metrics/funnel${qs}`, fetcher, { refreshInterval: 60000 });
    const { data: freight, error: freightError, isLoading: freightLoading, mutate: mutateFreight } = useSWR(`/api/cockpit/metrics/freight${qs}`, fetcher, { refreshInterval: 60000 });

    const loading = metricsLoading || funnelLoading || freightLoading;
    const error = metricsError || funnelError || freightError ? 'Aviso: falha parcial ao carregar dados. Os demais continuam operacionais.' : '';

    const fetchAll = useCallback(() => {
        mutateMetrics();
        mutateFunnel();
        mutateFreight();
    }, [mutateMetrics, mutateFunnel, mutateFreight]);

    return (
        <div className="space-y-6">
            {/* Header & Global Filters */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border border-gray-200/60 shadow-sm">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Controle Operacional</h2>
                    <p className="text-sm text-slate-500">Monitoramento de Funil e Conversões (7 dias)</p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-semibold text-slate-500 uppercase">Agrupar Origens por:</label>
                        <select 
                            className="text-sm border-gray-300 rounded-lg shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value as GroupByFilter)}
                            disabled={loading}
                        >
                            <option value="utm_campaign">Campanha (utm_campaign)</option>
                            <option value="utm_source">Fonte (utm_source)</option>
                            <option value="none">Nenhum</option>
                        </select>
                    </div>
                    
                    <button 
                        onClick={() => fetchAll()}
                        disabled={loading}
                        className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
                        title="Atualizar"
                    >
                        ↻
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm font-medium">
                    ⚠️ {error}
                </div>
            )}

            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Column (Main Stats & Funnel) */}
                <div className="lg:col-span-8 space-y-6">
                    <CockpitOverviewBlock metrics={metrics} funnel={funnel} loading={loading} />
                    <CockpitFunnelBlock funnel={funnel} loading={loading} />
                    <CockpitFreightBlock freight={freight} loading={loading} />
                </div>

                {/* Right Column (Attribution & Anomalies) */}
                <div className="lg:col-span-4 space-y-6">
                    <CockpitAttributionBlock funnel={funnel} groupBy={groupBy} loading={loading} />
                </div>
            </div>
        </div>
    );
}
