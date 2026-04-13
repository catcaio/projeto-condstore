import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { ComoFuncionaSection } from '@/mvp/site/ComoFuncionaSection';

export const metadata: Metadata = {
  title: 'Como funciona — MVP | LojaCond',
  description:
    'Entenda o fluxo operacional supervisionado do CONDSTORE OS: do WhatsApp ao pedido aprovado e rastreado.',
  robots: { index: false, follow: false },
};

/**
 * "Como funciona" page within the /mvp route group.
 * Gated by the same MVP feature flag as the entry page.
 */
export default function MvpComoFuncionaPage() {
  if (!MVP_FLAGS.enabled) {
    notFound();
  }

  return <ComoFuncionaSection />;
}
