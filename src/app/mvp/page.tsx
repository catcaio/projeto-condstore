import { notFound } from 'next/navigation';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { MvpShell } from '@/mvp/components/MvpShell';
import { LandingSection } from '@/mvp/site/LandingSection';

export const metadata = {
  title: 'Início | CONDSTORE OS',
  description:
    'Plataforma supervisionada de frete, pedidos e atendimento via WhatsApp para operação logística.',
  robots: { index: false, follow: false },
};

/**
 * Entry point for /mvp.
 * Gated by NEXT_PUBLIC_ENABLE_MVP=true.
 *
 * Shell is applied at page level (not layout) because /mvp/app uses a
 * different shell (AppShell). The root layout is intentionally neutral.
 */
export default function MvpPage() {
  if (!MVP_FLAGS.enabled) {
    notFound();
  }

  return (
    <MvpShell>
      <LandingSection />
    </MvpShell>
  );
}
