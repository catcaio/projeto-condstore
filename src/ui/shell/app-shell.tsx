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
        <div className="os-root min-h-screen bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] max-w-full overflow-x-hidden">
            <div className="flex min-h-screen flex-col md:flex-row max-w-full overflow-x-hidden">
                <aside className="w-full shrink-0 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] md:sticky md:top-0 md:h-screen md:w-[4.5rem] md:border-b-0 md:border-r z-30">
                    <div className="flex h-full flex-col items-center py-4">
                        <div className="flex items-center justify-center mb-6">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                                <CondstoreLogo size="sm" hideText />
                            </div>
                        </div>

                        <div className="flex-1 w-full overflow-y-auto remove-scrolbar flex flex-col items-center px-2">
                            <AppNav role={role} tenantId={tenantId} />
                        </div>

                        <div className="mt-auto flex flex-col items-center gap-4 pt-4 pb-2 border-t border-[hsl(var(--ui-border))] w-full">
                            <ThemeToggle />
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-screen min-w-0 flex-1 flex-col bg-[hsl(var(--ui-bg))]">
                    <header className="sticky top-0 z-20 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.92)] backdrop-blur px-4 py-3 md:px-6 flex min-h-[4rem] items-center justify-between gap-4">
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

                    <div className="flex-1 px-2 py-4 md:px-6 md:py-6 flex flex-col min-h-0">
                        <div className="mx-auto w-full max-w-[96rem] flex-1 flex flex-col min-h-0">
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
