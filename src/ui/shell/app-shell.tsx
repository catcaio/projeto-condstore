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
            <div className="grid h-full min-h-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[4.5rem_minmax(0,1fr)] md:grid-rows-1">
                <aside className="z-30 min-w-0 shrink-0 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] md:h-dvh md:border-b-0 md:border-r">
                    <div className="flex min-h-0 flex-col items-center px-3 py-3 md:h-full md:px-0 md:py-4">
                        <div className="mb-3 flex items-center justify-center md:mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                                <CondstoreLogo size="sm" hideText />
                            </div>
                        </div>

                        <div className="flex min-h-0 w-full flex-1 flex-col items-center overflow-y-auto px-0 md:px-2">
                            <AppNav role={role} tenantId={tenantId} />
                        </div>

                        <div className="mt-auto hidden w-full flex-col items-center gap-4 border-t border-[hsl(var(--ui-border))] pb-2 pt-4 md:flex">
                            <ThemeToggle />
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[hsl(var(--ui-bg))]">
                    <header className="z-20 flex min-h-[4rem] shrink-0 items-center justify-between gap-4 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.92)] px-4 py-3 backdrop-blur md:px-6">
                            <div className="min-w-0">
                                <ModuleBreadcrumb />
                                <p className="mt-1 text-xs text-[hsl(var(--ui-text-muted))]">
                                    Fundacao consolidada para cockpit, operacao, clientes, pedidos, logistica, Frank e governanca.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <InspectBadge role={role} />
                            </div>
                    </header>

                    {tenantId ? <FinOpsStatusBar tenantId={tenantId} /> : null}

                    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-4 md:px-6 md:py-6">
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
