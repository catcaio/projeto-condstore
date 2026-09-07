import * as React from 'react';
import { AppNav } from './app-nav';
import { type Role } from '@/ui/auth/entitlements-logic';
import { ThemeToggle } from '@/ui/theme';
import { InspectBadge } from './inspect-badge';
import { FinOpsStatusBar } from './finops-status-bar';
import { ModuleBreadcrumb, CondstoreLogo } from '@/ui/components';
import { FrankGlobalWidget } from '@/modules/frank/ui/global-assistant/frank-global-widget';
import { CommandPalette } from '@/ui/foundation';

export function AppShell({
    children,
    role,
    tenantId
}: {
    children: React.ReactNode,
    role: Role | string,
    tenantId: string | null
}) {
    return (
        <div className="os-root h-dvh max-w-full overflow-hidden bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))]">
            <div className="grid h-full min-h-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-1">
                <aside
                    aria-label="Navegação principal"
                    className="group/sidebar z-30 min-w-0 shrink-0 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] transition-[width] duration-200 ease-out md:h-dvh md:w-[4.5rem] md:border-b-0 md:border-r md:hover:w-64"
                >
                    <div className="flex min-h-0 flex-col px-3 py-3 md:h-full md:px-0 md:py-4">
                        <div className="mb-3 flex items-center justify-center md:mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm transition-[width] duration-200 md:group-hover/sidebar:w-[calc(100%-1.5rem)] md:group-hover/sidebar:gap-2 md:group-hover/sidebar:px-3">
                                <CondstoreLogo size="sm" hideText />
                                <span className="hidden truncate text-sm font-semibold md:group-hover/sidebar:inline">CONDSTORE</span>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto">
                            <AppNav role={role} tenantId={tenantId} />
                        </div>

                        <div className="mt-auto hidden w-full flex-col items-center gap-4 border-t border-[hsl(var(--ui-border))] pb-2 pt-4 md:flex">
                            <ThemeToggle />
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[hsl(var(--ui-bg))]">
                    <header className="z-20 flex min-h-[4rem] shrink-0 items-center justify-between gap-3 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.92)] px-4 py-3 backdrop-blur md:px-6">
                        <div className="min-w-0 flex-1">
                            <ModuleBreadcrumb />
                            <p className="mt-1 hidden truncate text-xs text-[hsl(var(--ui-text-muted))] sm:block">
                                Fundação consolidada para cockpit, operação, clientes, pedidos, logística, Frank e governança.
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <div className="md:hidden">
                                <AppNav
                                    role={role}
                                    tenantId={tenantId}
                                    mobileOnly
                                />
                            </div>
                            <InspectBadge role={role} />
                        </div>
                    </header>

                    {tenantId ? <FinOpsStatusBar tenantId={tenantId} /> : null}

                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 py-4 sm:px-4 md:px-6 md:py-6">
                        <div className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col">
                            {children}
                        </div>
                    </div>
                </main>
                <FrankGlobalWidget tenantId={tenantId} />
                <CommandPalette />
            </div>
        </div>
    );
}
