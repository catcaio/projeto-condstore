'use client';

/**
 * CockpitMetrics — smart component for real-time operational metrics.
 *
 * Fetches GET /api/cockpit/metrics (tenant-scoped, Redis-cached 30s) and renders
 * a 4-card grid:
 *   mensagensHoje | cotacoesHoje | pedidosHoje | erros24h
 *
 * Refresh controls:
 *   - Initial load: skeletons (animate-pulse) until first response
 *   - Auto-refresh: every 30s, silent (no skeleton flash, data updates in place)
 *   - Manual "↻ Atualizar" button: disabled while loading, shows skeletons on click
 *
 * Error state: compact one-line red banner; cards fall back to 0.
 * No page.tsx changes needed — this component is fully self-contained.
 */

import { useState, useEffect, useCallback } from 'react';
import { MetricCard, type MetricCardVariant } from './MetricCard';
import { MetricCardSkeleton } from './MetricCardSkeleton';
import { safeFetch } from '@/ui/lib/safe-fetch';
import { COCKPIT_METRICS_REFRESH_MS } from '@/modules/system-status/operational-guardrails';

interface CockpitMetricsData {
  mensagensHoje: number;
  cotacoesHoje: number;
  pedidosHoje: number;
  erros24h: number;
}

// Defined at module scope — stable reference, never re-created on render.
const CARDS: Array<{
  key: keyof CockpitMetricsData;
  title: string;
  colorVariant?: MetricCardVariant;
}> = [
    { key: 'mensagensHoje', title: 'Mensagens Hoje' },
    { key: 'cotacoesHoje', title: 'Cotações Hoje' },
    { key: 'pedidosHoje', title: 'Pedidos Hoje' },
    { key: 'erros24h', title: 'Erros 24h', colorVariant: 'error' },
  ];

export function CockpitMetrics() {
  const [data, setData] = useState<CockpitMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  /**
   * showSkeletons=true  → manual refresh: reset to skeleton grid while fetching.
   * showSkeletons=false → silent auto-refresh: data updates without skeleton flash.
   */
  const fetchMetrics = useCallback(async (showSkeletons = false) => {
    if (showSkeletons) setLoading(true);
    try {
      const res = await safeFetch('/api/cockpit/metrics');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData((await res.json()) as CockpitMetricsData);
      setError('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro ao carregar métricas',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(); // initial load — loading=true by default, shows skeletons
    const id = setInterval(() => fetchMetrics(false), COCKPIT_METRICS_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
          Métricas Operacionais
        </h2>
        <button
          type="button"
          onClick={() => fetchMetrics(true)}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors disabled:opacity-40"
          disabled={loading}
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Error state — compact, one-line, red accent only */}
      {error && (
        <p className="text-xs font-medium text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          ⚠️ {error}
        </p>
      )}

      {/* Card grid: skeletons while loading, real cards when ready */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))
          : CARDS.map((card) => (
            <MetricCard
              key={card.key}
              title={card.title}
              value={data ? data[card.key] : 0}
              colorVariant={card.colorVariant}
            />
          ))}
      </div>
    </section>
  );
}
