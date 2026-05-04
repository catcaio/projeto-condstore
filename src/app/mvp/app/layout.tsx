import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { getMvpSessionFromHeaders } from '@/mvp/lib/auth';
import { AppShell } from '@/mvp/components/AppShell';

export const metadata: Metadata = {
  title: 'Cockpit | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Layout for authenticated /mvp/app/* routes.
 * Wraps content in the AppShell (sidebar + topbar).
 *
 * Auth is enforced by Edge middleware. This layout reads the
 * session from middleware-injected headers and derives the
 * tenant name for display in the sidebar.
 */
export default async function MvpAppLayout({ children }: { children: ReactNode }) {
  if (!MVP_FLAGS.miniCockpit) {
    notFound();
  }

  const headersList = await headers();
  const session = getMvpSessionFromHeaders(headersList);

  // Defensive — middleware should prevent unauthenticated access.
  if (!session) {
    redirect('/login');
  }

  return (
    <AppShell tenantName={session.tenantId}>
      {children}
    </AppShell>
  );
}
