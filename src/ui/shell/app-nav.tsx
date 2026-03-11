'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ChevronRight, Menu, X } from 'lucide-react';
import { getPrimaryNavigationGroups, type ModuleConfig } from '@/config/modules';

function NavLink({ item, pathname }: { item: ModuleConfig; pathname: string }) {
    const Icon = item.icon;
    const isActive = pathname === item.route || pathname.startsWith(item.route + '/');

    return (
        <Link
            href={item.route}
            className={`
                group relative flex items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-all duration-150
                ${isActive
                    ? 'border-[hsl(var(--ui-accent-blue)/0.22)] bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-text))] shadow-[inset_0_0_0_1px_hsl(var(--ui-accent-blue)/0.08)]'
                    : 'border-transparent text-[hsl(var(--ui-text-muted))] hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-bg)/0.7)] hover:text-[hsl(var(--ui-text))]'
                }
            `}
        >
            {isActive && (
                <span className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full bg-[hsl(var(--ui-accent-blue))]" />
            )}
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${isActive ? 'border-[hsl(var(--ui-accent-blue)/0.18)] bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]' : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text-muted))] group-hover:text-[hsl(var(--ui-text))]'}`}>
                <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold">{item.label}</span>
                {item.summary ? (
                    <span className={`mt-1 block text-[11px] leading-4 ${isActive ? 'text-[hsl(var(--ui-text-muted))]' : 'text-[hsl(var(--ui-text-subtle))]'}`}>
                        {item.summary}
                    </span>
                ) : null}
            </span>
            <ChevronRight className={`mt-1 h-3.5 w-3.5 shrink-0 transition-transform ${isActive ? 'translate-x-0 text-[hsl(var(--ui-accent-blue))]' : 'text-[hsl(var(--ui-text-subtle))] group-hover:translate-x-0.5'}`} />
        </Link>
    );
}

export function AppNav({ role, tenantId }: { role: string; tenantId: string | null }) {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);
    const navGroups = getPrimaryNavigationGroups();

    const navContent = (
        <nav className="flex flex-col gap-6">
            {navGroups.map((group) => (
                <div key={group.key}>
                    <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                        {group.title}
                    </p>
                    <div className="flex flex-col gap-1.5">
                        {group.items.map((item) => (
                            <NavLink key={item.id} item={item} pathname={pathname} />
                        ))}
                    </div>
                </div>
            ))}

            <div className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-bg)/0.7)] px-3 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                    Sessao
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[hsl(var(--ui-border))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">
                        Perfil: {role}
                    </span>
                    {tenantId ? (
                        <span className="rounded-full border border-[hsl(var(--ui-border))] px-2.5 py-1 text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">
                            Tenant: {tenantId}
                        </span>
                    ) : null}
                </div>
            </div>
        </nav>
    );

    return (
        <>
            <div className="hidden md:block">
                {navContent}
            </div>

            <div className="md:hidden">
                <button
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="flex items-center gap-2 rounded-xl border border-[hsl(var(--ui-border))] px-3 py-2 text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    Navegacao
                </button>
                {mobileOpen ? (
                    <div className="mt-3 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-3">
                        {navContent}
                    </div>
                ) : null}
            </div>
        </>
    );
}
