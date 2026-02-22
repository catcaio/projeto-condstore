'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const items = [
  { label: 'Dashboard', href: '/cockpit' },
  { label: 'Analytics', href: '/cockpit/analytics' },
  { label: 'Cotações', href: '#' },
  { label: 'Pedidos', href: '#' },
  { label: 'Tenants', href: '#' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 flex h-full w-64 flex-col border-r border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-surface))]">
      <div className="flex h-16 items-center border-b border-[hsl(var(--cockpit-border))] px-6">
        <span className="text-lg font-bold uppercase tracking-wider text-[hsl(var(--cockpit-accent))]">
          CondStore
        </span>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          const isActive = item.href !== '#' && (pathname === item.href || pathname.startsWith(`${item.href}/`));

          const className = isActive
            ? 'rounded-md border border-[hsl(var(--cockpit-border))] bg-[hsl(var(--cockpit-bg))] px-2 py-2 text-sm font-medium text-[hsl(var(--cockpit-text))]'
            : 'rounded-md px-2 py-2 text-sm font-medium text-[hsl(var(--cockpit-text-muted))] transition-colors hover:text-[hsl(var(--cockpit-text))]';

          if (item.href === '#') {
            return (
              <div key={item.label} className={className}>
                {item.label}
              </div>
            );
          }

          return (
            <Link key={item.label} href={item.href} className={className}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[hsl(var(--cockpit-border))] p-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-[hsl(var(--cockpit-border))]" />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-[hsl(var(--cockpit-text))]">Admin</span>
            <span className="text-[10px] text-[hsl(var(--cockpit-text-muted))]">Logado</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
