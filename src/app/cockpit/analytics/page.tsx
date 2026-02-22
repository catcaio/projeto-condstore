'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type SummaryResponse = {
  totalEvents: number;
  uniqueAnon: number;
  counts: Array<{ event: string; count: number }>;
  funnel: {
    landing_view: number;
    pricing_view: number;
    pricing_click_checkout: number;
    rates: {
      pricing_view_over_landing_view: number;
      click_checkout_over_pricing_view: number;
    };
  };
};

type EventItem = {
  id: string;
  event: string;
  anonId: string;
  path: string;
  props: unknown;
  userAgent: string | null;
  createdAt: string;
};

const STREAM_LIMITS = [100, 250, 500] as const;

function shortAnonId(anonId: string): string {
  if (anonId.length <= 12) {
    return anonId;
  }

  return `${anonId.slice(0, 6)}...${anonId.slice(-4)}`;
}

function previewProps(props: unknown): string {
  const serialized = JSON.stringify(props ?? {});
  return serialized.length > 100 ? `${serialized.slice(0, 100)}...` : serialized;
}

export default function CockpitAnalyticsPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [errorSummary, setErrorSummary] = useState<string | null>(null);
  const [errorEvents, setErrorEvents] = useState<string | null>(null);
  const [planInactive, setPlanInactive] = useState(false);

  const [eventFilter, setEventFilter] = useState('');
  const [anonIdFilter, setAnonIdFilter] = useState('');
  const [limit, setLimit] = useState<(typeof STREAM_LIMITS)[number]>(100);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      try {
        setLoadingSummary(true);
        setErrorSummary(null);

        const response = await fetch('/api/cockpit/analytics/summary', { cache: 'no-store' });

        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        if (response.status === 402 || response.status === 403) {
          setPlanInactive(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Falha ao carregar resumo.');
        }

        const data = (await response.json()) as SummaryResponse;
        if (!cancelled) {
          setSummary(data);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorSummary(error instanceof Error ? error.message : 'Erro inesperado ao carregar resumo.');
        }
      } finally {
        if (!cancelled) {
          setLoadingSummary(false);
        }
      }
    }

    loadSummary();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (planInactive) {
      setLoadingEvents(false);
      return;
    }

    let cancelled = false;

    async function loadEvents() {
      try {
        setLoadingEvents(true);
        setErrorEvents(null);

        const params = new URLSearchParams();
        params.set('limit', String(limit));

        if (eventFilter) {
          params.set('event', eventFilter);
        }

        if (anonIdFilter.trim()) {
          params.set('anonId', anonIdFilter.trim());
        }

        const response = await fetch(`/api/cockpit/analytics/events?${params.toString()}`, { cache: 'no-store' });

        if (response.status === 401) {
          router.replace('/login');
          return;
        }

        if (response.status === 402 || response.status === 403) {
          setPlanInactive(true);
          return;
        }

        if (!response.ok) {
          throw new Error('Falha ao carregar stream de eventos.');
        }

        const data = (await response.json()) as { events: EventItem[] };

        if (!cancelled) {
          setEvents(data.events ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorEvents(error instanceof Error ? error.message : 'Erro inesperado ao carregar stream.');
        }
      } finally {
        if (!cancelled) {
          setLoadingEvents(false);
        }
      }
    }

    loadEvents();

    return () => {
      cancelled = true;
    };
  }, [anonIdFilter, eventFilter, limit, planInactive, router]);

  const topEvents = useMemo(() => summary?.counts ?? [], [summary]);

  const funnelMax = Math.max(
    summary?.funnel.landing_view ?? 0,
    summary?.funnel.pricing_view ?? 0,
    summary?.funnel.pricing_click_checkout ?? 0,
    1,
  );

  if (planInactive) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--cockpit-text))]">Analytics</h1>
        <div className="rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] p-4">
          <p className="text-sm text-[hsl(var(--cockpit-text))]">Plano inativo.</p>
          <a href="/billing/manage" className="mt-2 inline-block text-sm text-[hsl(var(--cockpit-accent))] hover:underline">
            Ir para gestão de cobrança
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--cockpit-text))]">Analytics</h1>

      {(errorSummary || errorEvents) && (
        <div className="rounded-lg border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] p-4 text-sm text-red-300">
          {errorSummary ?? errorEvents}
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Visits', value: summary?.funnel.landing_view ?? 0 },
          { label: 'Pricing views', value: summary?.funnel.pricing_view ?? 0 },
          { label: 'Checkout clicks', value: summary?.funnel.pricing_click_checkout ?? 0 },
          { label: 'Unique anon', value: summary?.uniqueAnon ?? 0 },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))] p-4">
            <p className="text-xs text-[hsl(var(--cockpit-text-muted))]">{card.label} (7d)</p>
            <p className="mt-2 text-2xl font-semibold">{loadingSummary ? '...' : card.value}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))]">
          <div className="border-b border-[hsl(var(--cockpit-border))] px-4 py-3">
            <h2 className="font-medium">Top events</h2>
          </div>
          <ul className="divide-y divide-[hsl(var(--cockpit-border))]">
            {topEvents.map((item) => (
              <li key={item.event} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>{item.event}</span>
                <span className="text-[hsl(var(--cockpit-text-muted))]">{item.count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))]">
          <div className="border-b border-[hsl(var(--cockpit-border))] px-4 py-3">
            <h2 className="font-medium">Funnel (MVP)</h2>
            <p className="text-xs text-[hsl(var(--cockpit-text-muted))]">Contagem por etapa no período de 7 dias (sem sequência inferida).</p>
          </div>
          <div className="space-y-4 px-4 py-4">
            {[
              { label: 'landing_view', value: summary?.funnel.landing_view ?? 0 },
              { label: 'pricing_view', value: summary?.funnel.pricing_view ?? 0 },
              { label: 'pricing_click_checkout', value: summary?.funnel.pricing_click_checkout ?? 0 },
            ].map((row) => (
              <div key={row.label}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span>{row.label}</span>
                  <span>{row.value}</span>
                </div>
                <div className="h-2 rounded bg-[hsl(var(--cockpit-bg))]">
                  <div
                    className="h-2 rounded bg-[hsl(var(--cockpit-accent))]"
                    style={{ width: `${Math.max((row.value / funnelMax) * 100, 2)}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 text-xs text-[hsl(var(--cockpit-text-muted))]">
              <div>pricing_view / landing_view: {summary?.funnel.rates.pricing_view_over_landing_view ?? 0}%</div>
              <div>click_checkout / pricing_view: {summary?.funnel.rates.click_checkout_over_pricing_view ?? 0}%</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))]">
        <div className="border-b border-[hsl(var(--cockpit-border))] px-4 py-3">
          <h2 className="font-medium">Event Stream</h2>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-[hsl(var(--cockpit-border))] px-4 py-3 md:grid-cols-3">
          <select
            value={eventFilter}
            onChange={(event) => setEventFilter(event.target.value)}
            className="rounded-md border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))] px-3 py-2 text-sm"
          >
            <option value="">Todos os eventos</option>
            {topEvents.map((item) => (
              <option key={item.event} value={item.event}>
                {item.event}
              </option>
            ))}
          </select>

          <input
            value={anonIdFilter}
            onChange={(event) => setAnonIdFilter(event.target.value)}
            placeholder="Filtrar por anonId"
            className="rounded-md border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))] px-3 py-2 text-sm"
          />

          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value) as (typeof STREAM_LIMITS)[number])}
            className="rounded-md border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))] px-3 py-2 text-sm"
          >
            {STREAM_LIMITS.map((value) => (
              <option key={value} value={value}>
                Limit {value}
              </option>
            ))}
          </select>
        </div>

        <div className="divide-y divide-[hsl(var(--cockpit-border))]">
          {loadingEvents && <div className="px-4 py-4 text-sm text-[hsl(var(--cockpit-text-muted))]">Carregando stream...</div>}

          {!loadingEvents && events.length === 0 && (
            <div className="px-4 py-4 text-sm text-[hsl(var(--cockpit-text-muted))]">Nenhum evento encontrado.</div>
          )}

          {events.map((item) => {
            const isExpanded = expandedId === item.id;
            return (
              <div key={item.id} className="px-4 py-3">
                <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-5 md:items-center">
                  <div className="font-medium">{item.event}</div>
                  <div className="text-[hsl(var(--cockpit-text-muted))]">{new Date(item.createdAt).toLocaleString()}</div>
                  <div className="text-[hsl(var(--cockpit-text-muted))]">{shortAnonId(item.anonId)}</div>
                  <div className="truncate text-[hsl(var(--cockpit-text-muted))]">{previewProps(item.props)}</div>
                  <button
                    type="button"
                    className="text-left text-xs text-[hsl(var(--cockpit-accent))] hover:underline"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? 'Ocultar props' : 'Expandir props'}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    <pre className="overflow-auto rounded bg-[hsl(var(--cockpit-bg))] p-3 text-xs">
                      {JSON.stringify(item.props, null, 2)}
                    </pre>
                    <button
                      type="button"
                      className="text-xs text-[hsl(var(--cockpit-accent))] hover:underline"
                      onClick={() => navigator.clipboard.writeText(JSON.stringify(item.props, null, 2))}
                    >
                      Copiar props
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
