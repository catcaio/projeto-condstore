import type { Metadata } from 'next';
import { PageHeader } from '@/mvp/ui/PageHeader';
import { EmptyState } from '@/mvp/ui/EmptyState';
import { Badge } from '@/mvp/ui/Badge';

export const metadata: Metadata = {
  title: 'Cotações — MVP | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Freight/Quotations stub — /mvp/app/freight
 * Entry point for multi-carrier freight quotations.
 * Full implementation in MVP Task 3 (Freight Flow).
 */
export default function FreightPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Cotações"
        subtitle="Cotações multi-transportadora pendentes de aprovação"
        badge={<Badge variant="muted">Em breve</Badge>}
        breadcrumb={[{ href: '/mvp/app', label: 'Cockpit' }, { label: 'Cotações' }]}
      />
      <EmptyState
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 4h12a1 1 0 0 1 1 1v2a1 1 0 0 0 .5.87L19 9v6a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V9l1.5-1.13A1 1 0 0 0 3 7V5a1 1 0 0 1 1-1z" />
          </svg>
        }
        title="Nenhuma cotação pendente"
        description="As cotações de frete geradas pelo sistema aparecerão aqui para revisão e aprovação pelo operador."
      />
    </div>
  );
}
