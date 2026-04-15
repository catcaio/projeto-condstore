import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { MvpShell } from '@/mvp/components/MvpShell';
import { ComoFuncionaSection } from '@/mvp/site/ComoFuncionaSection';

export const metadata: Metadata = {
  title: 'Como funciona | CONDSTORE OS',
  description:
    'Entenda o fluxo operacional supervisionado do CONDSTORE OS: do WhatsApp ao pedido aprovado e rastreado.',
  robots: { index: false, follow: false },
};

/**
 * "Como funciona" page — /mvp/como-funciona.
 * Shell applied at page level for independent layout control.
 */
export default function MvpComoFuncionaPage() {
  if (!MVP_FLAGS.enabled) {
    notFound();
  }

  return (
    <MvpShell>
      <ComoFuncionaSection />
    </MvpShell>
  );
}
