import { headers } from 'next/headers';
import { redirect, notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { MVP_FLAGS } from '@/mvp/config/flags';
import { getMvpSessionFromHeaders } from '@/mvp/lib/auth';
import { CockpitMini } from '@/mvp/app/CockpitMini';

export const metadata: Metadata = {
  title: 'App — MVP | LojaCond',
  robots: { index: false, follow: false },
};

/**
 * Protected entry point for authenticated MVP users at /mvp/app.
 *
 * Auth is enforced by the Edge middleware (matcher includes /mvp/app/:path*).
 * The middleware injects x-auth-* headers when the session cookie is valid
 * and redirects unauthenticated visitors to /auth/login.
 *
 * This page reads the injected headers via getMvpSessionFromHeaders() and
 * renders CockpitMini with the session context.
 */
export default async function MvpAppPage() {
  if (!MVP_FLAGS.enabled) {
    notFound();
  }

  const headersList = await headers();
  const session = getMvpSessionFromHeaders(headersList);

  // Should not happen if middleware is correctly configured, but defensive.
  if (!session) {
    redirect('/auth/login');
  }

  return <CockpitMini session={session} />;
}
