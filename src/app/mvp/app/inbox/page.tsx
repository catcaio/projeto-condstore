import type { Metadata } from 'next';
import { PageHeader } from '@/mvp/ui/PageHeader';
import { EmptyState } from '@/mvp/ui/EmptyState';
import { Badge } from '@/mvp/ui/Badge';

export const metadata: Metadata = {
  title: 'Inbox — MVP | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Inbox stub — /mvp/app/inbox
 * Entry point for WhatsApp conversations management.
 * Full implementation in MVP Task 2 (Atendimento).
 */
export default function InboxPage() {
  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        title="Inbox"
        subtitle="Conversas via WhatsApp — atendimento supervisionado"
        badge={null}

        breadcrumb={[{ href: '/mvp/app', label: 'Cockpit' }, { label: 'Inbox' }]}
      />
      <EmptyState
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 3H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3l3 3 3-3h7a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1z" />
          </svg>
        }
        title="Nenhuma conversa ativa"
        description="As conversas recebidas via WhatsApp aparecerão aqui para revisão e resposta supervisionada."
      />
    </div>
  );
}
