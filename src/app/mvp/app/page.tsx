import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { getMvpSessionFromHeaders } from '@/mvp/lib/auth';
import { CockpitMini } from '@/mvp/app/CockpitMini';

export const metadata: Metadata = {
  title: 'Cockpit — MVP | CONDSTORE OS',
  robots: { index: false, follow: false },
};

/**
 * Protected entry point at /mvp/app.
 *
 * Layout is provided by ./layout.tsx (AppShell).
 * This page is responsible only for fetching the session and
 * rendering the cockpit overview.
 */
export default async function MvpAppPage() {
  if (!MVP_FLAGS.miniCockpit) {
    notFound();
  }

  const headersList = await headers();
  const session = getMvpSessionFromHeaders(headersList);

  if (!session) {
    redirect('/auth/login');
  }

  return <CockpitMini session={session} />;
}
