import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { MvpShell } from '@/mvp/components/MvpShell';

export const metadata: Metadata = {
  title: 'MVP | LojaCond',
  robots: { index: false, follow: false },
};

/**
 * Layout wrapper for the /mvp route group.
 * Uses the lightweight MvpShell — does not pull in the full application shell.
 */
export default function MvpLayout({ children }: { children: ReactNode }) {
  return <MvpShell>{children}</MvpShell>;
}
