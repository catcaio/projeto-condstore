import * as React from 'react';
import { Sidebar } from './app-nav';
import { type Role } from '@/ui/auth/entitlements-logic';
import { InspectBadge } from './inspect-badge';
import { FinOpsStatusBar } from './finops-status-bar';
import { ModuleBreadcrumb } from '@/ui/components';
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
            <div className="grid h-full min-h-0 max-w-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-1 transition-[grid-template-columns] duration-200">
                <Sidebar role={role} tenantId={tenantId} />

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
