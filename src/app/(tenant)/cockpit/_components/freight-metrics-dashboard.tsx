'use client';

import { useEffect, useMemo, useState } from 'react';

interface FreightMetricsData {
  total_simulations_7d: number;
  top_ufs_7d: Array<{ uf: string; count: number }>;
  avg_valor_by_uf_7d: Array<{ uf: string; avg_valor: number }>;
  avg_peso_7d: number;
  avg_prazo_by_uf_7d: Array<{ uf: string; avg_prazo: number }>;
  daily_14d: Array<{ date: string; count: number }>;
}

const POLL_INTERVAL_MS = 60_000;

const EMPTY_DATA: FreightMetricsData = {
  total_simulations_7d: 0,
  top_ufs_7d: [],
  avg_valor_by_uf_7d: [],
  avg_peso_7d: 0,
  avg_prazo_by_uf_7d: [],
  daily_14d: [],
};

function ListSection({
  title,
  rows,
  valueFormatter,
}: {
  title: string;
  rows: Array<{ uf: string; value: number }>;
  valueFormatter?: (value: number) => string;
}) {
  return (
    <section className="rounded-2xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
      <div className="px-5 py-3 border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]/30">
        <h3 className="text-sm font-semibold text-[hsl(var(--cockpit-text))]">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <p className="px-5 py-4 text-sm text-[hsl(var(--cockpit-text-muted))]">Sem dados no período.</p>
      ) : (
        <ul className="divide-y divide-[hsl(var(--cockpit-border))]">
          {rows.map((row) => (
            <li key={`${title}-${row.uf}`} className="px-5 py-3 flex items-center justify-between text-sm">
              <span className="font-medium text-[hsl(var(--cockpit-text))]">{row.uf}</span>
              <span className="text-[hsl(var(--cockpit-text-muted))]">
                {valueFormatter ? valueFormatter(row.value) : row.value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function FreightMetricsDashboard() {
  const [data, setData] = useState<FreightMetricsData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchMetrics = async (showLoader = false) => {
      if (showLoader) {
        setLoading(true);
      }

      try {
        const response = await fetch('/api/cockpit/metrics/freight', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });

        if (!response.ok) {
          throw new Error(`Failed with status ${response.status}`);
        }

        const payload = (await response.json()) as FreightMetricsData;

        if (!isMounted) {
          return;
        }

        setData(payload);
        setError(null);
      } catch {
        if (!isMounted) {
          return;
        }
        setError('Não foi possível carregar as métricas de frete.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchMetrics(true);
    const timer = setInterval(() => {
      void fetchMetrics(false);
    }, POLL_INTERVAL_MS);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  const dailyMax = useMemo(
    () => Math.max(1, ...data.daily_14d.map((point) => point.count)),
    [data.daily_14d]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]/30">
          <h2 className="text-base font-semibold text-[hsl(var(--cockpit-text))]">Métricas de Frete</h2>
          <p className="text-xs text-[hsl(var(--cockpit-text-muted))]">Últimos 7 dias (KPIs) e série diária de 14 dias</p>
        </div>

        {error ? <p className="px-5 py-4 text-sm text-red-500">{error}</p> : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <div className="rounded-xl border border-[hsl(var(--cockpit-border))] p-4">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--cockpit-text-muted))]">Total simulações 7d</p>
            <p className="mt-2 text-3xl font-semibold text-[hsl(var(--cockpit-text))]">
              {loading ? '...' : data.total_simulations_7d}
            </p>
          </div>

          <div className="rounded-xl border border-[hsl(var(--cockpit-border))] p-4">
            <p className="text-xs uppercase tracking-wide text-[hsl(var(--cockpit-text-muted))]">Média peso 7d</p>
            <p className="mt-2 text-3xl font-semibold text-[hsl(var(--cockpit-text))]">
              {loading ? '...' : `${data.avg_peso_7d.toFixed(2)} kg`}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ListSection
          title="Top UFs 7d"
          rows={data.top_ufs_7d.map((item) => ({ uf: item.uf, value: item.count }))}
        />

        <ListSection
          title="Média valor por UF 7d"
          rows={data.avg_valor_by_uf_7d.map((item) => ({ uf: item.uf, value: item.avg_valor }))}
          valueFormatter={(value) => `R$ ${value.toFixed(2)}`}
        />

        <ListSection
          title="Média prazo por UF 7d"
          rows={data.avg_prazo_by_uf_7d.map((item) => ({ uf: item.uf, value: item.avg_prazo }))}
          valueFormatter={(value) => `${value.toFixed(1)} dias`}
        />
      </div>

      <section className="rounded-2xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] overflow-hidden">
        <div className="px-5 py-3 border-b border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))]/30">
          <h3 className="text-sm font-semibold text-[hsl(var(--cockpit-text))]">Série diária 14d</h3>
        </div>

        {data.daily_14d.length === 0 ? (
          <p className="px-5 py-4 text-sm text-[hsl(var(--cockpit-text-muted))]">Sem dados no período.</p>
        ) : (
          <ul className="divide-y divide-[hsl(var(--cockpit-border))]">
            {data.daily_14d.map((point) => (
              <li key={point.date} className="px-5 py-3 flex items-center gap-3">
                <span className="text-sm w-28 text-[hsl(var(--cockpit-text))]">{point.date}</span>
                <div className="h-2 flex-1 rounded-full bg-[hsl(var(--cockpit-bg))] overflow-hidden">
                  <div
                    className="h-full bg-[hsl(var(--cockpit-accent))]"
                    style={{ width: `${(point.count / dailyMax) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-[hsl(var(--cockpit-text-muted))] min-w-8 text-right">{point.count}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
