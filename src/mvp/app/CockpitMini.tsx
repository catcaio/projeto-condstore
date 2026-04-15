'use client';

import type { MvpSession } from '../lib/auth';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { useEffect, useState } from 'react';

interface CockpitMiniProps {
  session: MvpSession;
}

interface Metrics {
  mensagensHoje: number;
  cotacoesHoje: number;
  pedidosHoje: number;
  erros24h: number;
}

interface TimelineEvent {
  id: string;
  entity: string;
  entityId: string;
  eventType: string;
  title: string;
  description: string;
  createdAt: string;
  actor?: string;
}

interface TimelineResponse {
  ok: boolean;
  data: {
    events: TimelineEvent[];
    nextCursor?: string;
  };
}

/**
 * Minimal cockpit view for authenticated MVP users at /mvp/app.
 * Shows operational overview with entry points to all MVP surfaces.
 * Uses core UI components — sets the pattern for future cockpit pages.
 */
export function CockpitMini({ session }: CockpitMiniProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [loadingTimeline, setLoadingTimeline] = useState(true);
  const [errorMetrics, setErrorMetrics] = useState(false);
  const [errorTimeline, setErrorTimeline] = useState(false);

  useEffect(() => {
    fetchMetrics();
    fetchTimeline();
  }, []);

  const fetchMetrics = async () => {
    try {
      const res = await fetch('/api/cockpit/metrics');
      if (!res.ok) throw new Error('Failed to fetch metrics');
      const data: Metrics = await res.json();
      setMetrics(data);
    } catch (err) {
      setErrorMetrics(true);
    } finally {
      setLoadingMetrics(false);
    }
  };

  const fetchTimeline = async () => {
    try {
      const res = await fetch('/api/cockpit/timeline?limit=10');
      if (!res.ok) throw new Error('Failed to fetch timeline');
      const data: TimelineResponse = await res.json();
      setTimeline(data.data.events);
    } catch (err) {
      setErrorTimeline(true);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const retryMetrics = () => {
    setErrorMetrics(false);
    setLoadingMetrics(true);
    fetchMetrics();
  };

  const retryTimeline = () => {
    setErrorTimeline(false);
    setLoadingTimeline(true);
    fetchTimeline();
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Cockpit"
        subtitle={`Tenant ${session.tenantId} · Perfil ${session.role}`}
        badge={
          <Badge variant="success" dot>
            Supervisionado
          </Badge>
        }
      />

      {/* ── Status cards ─────────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingMetrics ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} elevated>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-12" />
              </div>
            </Card>
          ))
        ) : errorMetrics ? (
          <div className="col-span-full">
            <EmptyState
              icon={
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="10" cy="10" r="8" />
                  <path d="M10 6v4" />
                  <path d="M10 14h.01" />
                </svg>
              }
              title="Erro ao carregar métricas"
              description="Não foi possível carregar as métricas operacionais."
              action={
                <button
                  onClick={retryMetrics}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Tentar novamente
                </button>
              }
            />
          </div>
        ) : metrics ? (
          STAT_CARDS.map((card) => {
            const value = card.key === 'mensagensHoje' ? metrics.mensagensHoje :
                         card.key === 'cotacoesHoje' ? metrics.cotacoesHoje :
                         card.key === 'pedidosHoje' ? metrics.pedidosHoje :
                         card.key === 'erros24h' ? metrics.erros24h : 0;
            return (
              <Card key={card.label} elevated>
                <div className="space-y-2">
                  <p
                    className="text-xs font-medium uppercase tracking-wider"
                    style={{ color: 'hsl(var(--mvp-text-3))' }}
                  >
                    {card.label}
                  </p>
                  <p
                    className="text-2xl font-semibold"
                    style={{ color: 'hsl(var(--mvp-text-1))' }}
                  >
                    {value}
                  </p>
                </div>
              </Card>
            );
          })
        ) : null}
      </div>

      {/* ── Operational queue ────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          label="Fila operacional"
          title="Itens prioritários"
          description="Eventos recentes que requerem atenção."
        />
        {loadingTimeline ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i} elevated>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </Card>
            ))}
          </div>
        ) : errorTimeline ? (
          <EmptyState
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="10" cy="10" r="8" />
                <path d="M10 6v4" />
                <path d="M10 14h.01" />
              </svg>
            }
            title="Erro ao carregar fila"
            description="Não foi possível carregar os itens da fila operacional."
            action={
              <button
                onClick={retryTimeline}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Tentar novamente
              </button>
            }
          />
        ) : timeline.length === 0 ? (
          <EmptyState
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="3" width="16" height="13" rx="2" />
                <path d="M2 7h16" />
              </svg>
            }
            title="Nenhum item prioritário"
            description="A fila operacional está vazia. Novos eventos aparecerão aqui."
          />
        ) : (
          <div className="space-y-3">
            {timeline.slice(0, 10).map((event) => (
              <Card key={event.id} elevated>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold" style={{ color: 'hsl(var(--mvp-text-1))' }}>
                      {event.title}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--mvp-text-3))' }}>
                      {event.description}
                    </p>
                    <p className="text-xs" style={{ color: 'hsl(var(--mvp-text-3))' }}>
                      {new Date(event.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <Badge variant="info">{event.entity}</Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ── Entry points ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          label="Superfícies"
          title="Áreas operacionais"
          description="Acesse os módulos principais do MVP supervisionado."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ENTRY_POINTS.map((entry) => (
            <a
              key={entry.href}
              href={entry.href}
              className="block p-4 rounded-[var(--mvp-radius-md)] border transition-all duration-150 group"
              style={{
                background: 'hsl(var(--mvp-surface-1))',
                border: '1px solid hsl(var(--mvp-border))',
              }}
            >
              <p
                className="text-sm font-semibold mb-1 group-hover:text-[hsl(var(--mvp-text-1))]"
                style={{ color: 'hsl(var(--mvp-text-1))' }}
              >
                {entry.label}
              </p>
              <p
                className="text-xs leading-relaxed"
                style={{ color: 'hsl(var(--mvp-text-3))' }}
              >
                {entry.description}
              </p>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}

const STAT_CARDS = [
  { label: 'Mensagens hoje', key: 'mensagensHoje' },
  { label: 'Cotações hoje', key: 'cotacoesHoje' },
  { label: 'Pedidos hoje', key: 'pedidosHoje' },
  { label: 'Erros 24h', key: 'erros24h' },
] as const;

const ENTRY_POINTS = [
  {
    href:  '/mvp/app/inbox',
    label: 'Inbox',
    description: 'Conversas e atendimentos via WhatsApp.',
  },
  {
    href:  '/mvp/app/freight',
    label: 'Cotações',
    description: 'Cotações multi-transportadora pendentes de aprovação.',
  },
  {
    href:  '/mvp/app/orders',
    label: 'Pedidos',
    description: 'Pedidos aprovados, em transporte e entregues.',
  },
  {
    href:  '/mvp/app/settings',
    label: 'Configurações',
    description: 'Tenant, transportadoras, operadores e preferências.',
  },
] as const;
