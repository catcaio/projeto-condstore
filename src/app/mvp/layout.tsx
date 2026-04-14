import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/mvp/styles/tokens.mvp.css';

export const metadata: Metadata = {
  title: {
    template: '%s | CONDSTORE OS',
    default: 'CONDSTORE OS — MVP',
  },
  robots: { index: false, follow: false },
};

/**
 * Root layout for the /mvp route group.
 *
 * Intentionally minimal — no shell applied here.
 * Each sub-surface owns its own layout:
 *   - /mvp/page.tsx       → wrapped by MvpShell via mvp-site-layout.tsx
 *   - /mvp/como-funciona  → wrapped by MvpShell via mvp-site-layout.tsx
 *   - /mvp/app/*          → wrapped by AppShell via /mvp/app/layout.tsx
 *
 * This prevents double-wrapping and lets each surface control
 * its own chrome independently.
 */
export default function MvpRootLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
