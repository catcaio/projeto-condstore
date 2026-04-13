'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface MvpShellProps {
  children: ReactNode;
}

const NAV_LINKS = [
  { href: '/mvp', label: 'Início' },
  { href: '/mvp/como-funciona', label: 'Como funciona' },
] as const;

/**
 * Minimal layout wrapper used exclusively within the /mvp route group.
 * Intentionally lightweight — no dependency on the main app shell.
 *
 * Marked 'use client' only for usePathname() active-nav highlighting.
 * No heavy module pulled in.
 */
export function MvpShell({ children }: MvpShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href="/mvp"
            className="font-semibold text-foreground text-sm tracking-tight hover:opacity-80 transition-opacity"
          >
            LojaCond
          </Link>
          <span className="text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5 select-none">
            MVP
          </span>
        </div>

        <nav className="flex items-center gap-1" aria-label="Navegação MVP">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={[
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  isActive
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                ].join(' ')}
                aria-current={isActive ? 'page' : undefined}
              >
                {label}
              </Link>
            );
          })}
          <Link
            href="/auth/login"
            className="ml-2 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-1.5 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Entrar
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-8">{children}</main>

      <footer className="border-t px-6 py-4 text-center text-xs text-muted-foreground shrink-0">
        CONDSTORE OS &middot; MVP supervisionado &middot;{' '}
        <Link href="/privacidade" className="underline underline-offset-2 hover:text-foreground">
          Privacidade
        </Link>
      </footer>
    </div>
  );
}
