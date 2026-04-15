'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

interface AppShellProps {
  children: ReactNode;
  /** Tenant display name for the topbar */
  tenantName?: string;
}

type NavArea = 'cockpit' | 'inbox' | 'freight' | 'orders' | 'settings';

interface NavItem {
  href: string;
  label: string;
  area: NavArea;
  icon: ReactNode;
  badge?: string;
}

// ─── Ícones inline mínimos — sem dependência de lib pesada ─────
const Icons = {
  grid: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  messageCircle: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 8A6 6 0 0 1 2 8a6 6 0 0 1 12 0z" />
      <path d="M8 14c1.5 0 3-.5 4-1.5L14 14l-1.5-2A6 6 0 0 1 8 14z" />
    </svg>
  ),
  package: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5.5L8 2l6 3.5M2 5.5v5L8 14l6-3.5V5.5M8 2v12M2 5.5L8 9l6-3.5" />
    </svg>
  ),
  truck: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="1" y="4" width="9" height="8" rx="1" />
      <path d="M10 7h3l2 3v2h-5V7z" />
      <circle cx="4" cy="13" r="1.5" />
      <circle cx="12" cy="13" r="1.5" />
    </svg>
  ),
  settings: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" />
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3M11 11l3-3-3-3M14 8H6" />
    </svg>
  ),
};

const NAV_ITEMS: NavItem[] = [
  { href: '/mvp/app', label: 'Cockpit',    area: 'cockpit',  icon: Icons.grid },
  { href: '/mvp/app/inbox',   label: 'Inbox',      area: 'inbox',    icon: Icons.messageCircle },
  { href: '/mvp/app/freight', label: 'Cotações',   area: 'freight',  icon: Icons.package },
  { href: '/mvp/app/orders',  label: 'Pedidos',    area: 'orders',   icon: Icons.truck },
  { href: '/mvp/app/settings',label: 'Config.',    area: 'settings', icon: Icons.settings },
];

/**
 * Authenticated app shell for /mvp/app — cockpit-style layout.
 * Sidebar + topbar + content area with proper state management.
 */
export function AppShell({ children, tenantName }: AppShellProps) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.href === '/mvp/app') return pathname === '/mvp/app';
    return pathname.startsWith(item.href);
  }

  return (
    <div className="mvp-root flex min-h-dvh">
      {/* ── Sidebar ──────────────────────────────────────────────── */}
      <aside
        className="fixed inset-y-0 left-0 z-40 flex flex-col"
        style={{
          width: 'var(--mvp-sidebar-w)',
          background: 'hsl(var(--mvp-surface-0))',
          borderRight: '1px solid hsl(var(--mvp-border))',
        }}
        aria-label="Navegação lateral"
      >
        {/* Wordmark */}
        <div
          className="flex items-center gap-2.5 px-4 shrink-0"
          style={{
            height: 'var(--mvp-topbar-h)',
            borderBottom: '1px solid hsl(var(--mvp-border))',
          }}
        >
          <span
            className="w-6 h-6 rounded-[var(--mvp-radius-xs)] flex items-center justify-center text-white text-[10px] font-bold shrink-0"
            style={{ background: 'hsl(var(--mvp-accent))' }}
            aria-hidden="true"
          >
            CS
          </span>
          <div className="min-w-0">
            <p
              className="text-xs font-semibold tracking-tight leading-none truncate"
              style={{ color: 'hsl(var(--mvp-text-1))' }}
            >
              CONDSTORE OS
            </p>
            {tenantName && (
              <p
                className="text-[10px] mt-0.5 truncate"
                style={{ color: 'hsl(var(--mvp-text-3))' }}
              >
                {tenantName}
              </p>
            )}
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto" aria-label="Áreas do sistema">
          <p
            className="text-[10px] font-semibold uppercase tracking-widest px-2 mb-2"
            style={{ color: 'hsl(var(--mvp-text-3))' }}
          >
            Operação
          </p>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className="mvp-nav-link flex items-center gap-3 px-3 py-2 rounded-[var(--mvp-radius-sm)] text-sm"
                style={{
                  color: active ? 'hsl(var(--mvp-text-1))' : 'hsl(var(--mvp-text-3))',
                  background: active ? 'hsl(var(--mvp-surface-3))' : 'transparent',
                  fontWeight: active ? 500 : 400,
                  paddingLeft: '12px', // extra for indicator clearance
                }}
              >
                <span
                  style={{ color: active ? 'hsl(var(--mvp-accent))' : 'hsl(var(--mvp-text-3))' }}
                >
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span
                    className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: 'hsl(var(--mvp-accent-bg))',
                      color: 'hsl(var(--mvp-accent))',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer section */}
        <div
          className="px-2 py-3"
          style={{ borderTop: '1px solid hsl(var(--mvp-border))' }}
        >
          <a
            href="/auth/login"
            className="flex items-center gap-3 px-3 py-2 rounded-[var(--mvp-radius-sm)] text-sm transition-all duration-150 w-full"
            style={{ color: 'hsl(var(--mvp-text-3))' }}
          >
            {Icons.logout}
            <span>Sair</span>
          </a>
        </div>
      </aside>

      {/* ── Main column ─────────────────────────────────────────── */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ marginLeft: 'var(--mvp-sidebar-w)' }}
      >
        {/* Topbar */}
        <header
          className="sticky top-0 z-30 flex items-center px-6 gap-3 shrink-0"
          style={{
            height: 'var(--mvp-topbar-h)',
            background: 'hsl(var(--mvp-bg) / 0.9)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderBottom: '1px solid hsl(var(--mvp-border))',
          }}
        >
          {/* Current area title — derived from active nav item */}
          <p
            className="text-sm font-semibold flex-1 truncate"
            style={{ color: 'hsl(var(--mvp-text-1))' }}
          >
            {NAV_ITEMS.find(isActive)?.label ?? 'Cockpit'}
          </p>

          {/* Right slot — placeholder for future tenant/user menu */}
          <div className="flex items-center gap-2">
            <span
              className="text-xs px-2 py-1 rounded-full border"
              style={{
                color: 'hsl(var(--mvp-accent))',
                borderColor: 'hsl(var(--mvp-accent) / 0.25)',
                background: 'hsl(var(--mvp-accent-bg))',
              }}
            >
              Supervisionado
            </span>
          </div>
        </header>

        {/* Content */}
        <main
          className="flex-1 p-6 overflow-y-auto"
          style={{ background: 'hsl(var(--mvp-bg))' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
