'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface MvpShellProps {
  children: ReactNode;
}

// ─── Navigação do shell público (marketing/landing) ─────────────
const PUBLIC_NAV = [
  { href: '/mvp', label: 'Início', exact: true },
  { href: '/mvp/como-funciona', label: 'Como funciona', exact: false },
] as const;

/**
 * Minimal shell for /mvp public-facing surface.
 * Premium, editorial design — zero dependency on the main app shell.
 * Marked 'use client' for pathname-based nav highlight only.
 */
export function MvpShell({ children }: MvpShellProps) {
  const pathname = usePathname();

  return (
    <div className="mvp-root flex flex-col min-h-dvh">
      {/* ── Topbar ────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 h-[var(--mvp-topbar-h)] flex items-center px-6"
        style={{
          background: 'hsl(var(--mvp-surface-0) / 0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid hsl(var(--mvp-border))',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/mvp"
          className="flex items-center gap-2.5 group focus-visible:outline-none"
          aria-label="CONDSTORE OS — ir ao início"
        >
          <span
            className="w-6 h-6 rounded-[var(--mvp-radius-xs)] flex items-center justify-center text-white text-[10px] font-bold"
            style={{ background: 'hsl(var(--mvp-accent))' }}
            aria-hidden="true"
          >
            CS
          </span>
          <span
            className="text-sm font-semibold tracking-tight"
            style={{ color: 'hsl(var(--mvp-text-1))' }}
          >
            CONDSTORE
          </span>
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border"
            style={{
              color: 'hsl(var(--mvp-accent))',
              borderColor: 'hsl(var(--mvp-accent) / 0.3)',
              background: 'hsl(var(--mvp-accent-bg))',
            }}
          >
            OS
          </span>
        </Link>

        {/* Nav */}
        <nav
          className="flex-1 flex items-center justify-center gap-1"
          aria-label="Navegação principal"
        >
          {PUBLIC_NAV.map(({ href, label, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className="px-3 py-1.5 rounded-[var(--mvp-radius-sm)] text-sm transition-all duration-150"
                style={{
                  color: isActive
                    ? 'hsl(var(--mvp-text-1))'
                    : 'hsl(var(--mvp-text-3))',
                  background: isActive ? 'hsl(var(--mvp-surface-3))' : 'transparent',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* CTA */}
        <Link
          href="/login"
          className="inline-flex items-center h-8 px-4 rounded-[var(--mvp-radius-sm)] text-sm font-medium transition-all duration-150 focus-visible:outline-none"
          style={{
            background: 'hsl(var(--mvp-accent))',
            color: 'white',
          }}
        >
          Entrar
        </Link>
      </header>

      {/* ── Main content — offset topbar height ────────────────── */}
      <main
        className="flex-1 px-6"
        style={{ paddingTop: 'calc(var(--mvp-topbar-h) + 2rem)', paddingBottom: '3rem' }}
      >
        {children}
      </main>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <footer
        className="border-t px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3"
        style={{
          borderColor: 'hsl(var(--mvp-border))',
          background: 'hsl(var(--mvp-surface-0))',
        }}
      >
        <p
          className="text-xs"
          style={{ color: 'hsl(var(--mvp-text-3))' }}
        >
          © {new Date().getFullYear()} CONDSTORE OS · Plataforma supervisionada
        </p>
        <nav className="flex items-center gap-4" aria-label="Links do rodapé">
          {[
            { href: '/mvp/como-funciona', label: 'Como funciona' },
            { href: '/login', label: 'Entrar' },
            { href: '/privacidade', label: 'Privacidade' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-xs transition-colors duration-150 hover:text-[hsl(var(--mvp-text-1))]"
              style={{ color: 'hsl(var(--mvp-text-3))' }}
            >
              {label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
