import type { Metadata } from 'next';
import { PageHeader } from '@/mvp/ui/PageHeader';
import { EmptyState } from '@/mvp/ui/EmptyState';
import { Badge } from '@/mvp/ui/Badge';

export const metadata: Metadata = {
  title: 'Pedidos — MVP | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Orders stub — /mvp/app/orders
 * Entry point for order lifecycle management.
 * Full implementation in MVP Task 4 (Orders/Shipments).
 */
export default function OrdersPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Pedidos"
        subtitle="Ciclo completo — aprovados, em transporte e entregues"
        badge={null}

        breadcrumb={[{ href: '/mvp/app', label: 'Cockpit' }, { label: 'Pedidos' }]}
      />
      <EmptyState
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <path d="M2 8h16M7 3v5M13 3v5" />
          </svg>
        }
        title="Nenhum pedido registrado"
        description="Os pedidos aprovados e em andamento aparecerão aqui com rastreio e status em tempo real."
      />
    </div>
  );
}
