import type { MvpSession } from '../lib/auth';
import { PageHeader } from '../ui/PageHeader';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SectionHeader } from '../ui/SectionHeader';
import { EmptyState } from '../ui/EmptyState';

interface CockpitMiniProps {
  session: MvpSession;
}

/**
 * Minimal cockpit view for authenticated MVP users at /mvp/app.
 * Shows operational overview with entry points to all MVP surfaces.
 * Uses core UI components — sets the pattern for future cockpit pages.
 */
export function CockpitMini({ session }: CockpitMiniProps) {
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
        {STAT_CARDS.map((card) => (
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
                {card.value}
              </p>
              {card.delta && (
                <Badge variant={card.deltaPositive ? 'success' : 'warning'}>
                  {card.delta}
                </Badge>
              )}
            </div>
          </Card>
        ))}
      </div>

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

      {/* ── Recent activity placeholder ──────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader label="Atividade" title="Eventos recentes" />
        <EmptyState
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2" y="3" width="16" height="13" rx="2" />
              <path d="M2 7h16" />
            </svg>
          }
          title="Nenhum evento recente"
          description="Os eventos operacionais aparecerão aqui conforme a plataforma for utilizada."
        />
      </section>
    </div>
  );
}

const STAT_CARDS = [
  { label: 'Pedidos hoje',      value: '—', delta: undefined,      deltaPositive: true  },
  { label: 'Conversas ativas',  value: '—', delta: undefined,      deltaPositive: true  },
  { label: 'Cotações pendentes',value: '—', delta: undefined,      deltaPositive: false },
  { label: 'Erros 24h',         value: '—', delta: undefined,      deltaPositive: false },
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
