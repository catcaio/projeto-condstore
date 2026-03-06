import * as React from 'react';
import { AppNav } from './app-nav';
import { type Role } from '@/ui/auth/entitlements-logic';
import { ThemeToggle } from '@/ui/theme';
import { InspectBadge } from './inspect-badge';
import { FinOpsStatusBar } from './finops-status-bar';
import { Box } from 'lucide-react';
import { ModuleBreadcrumb, CondstoreLogo } from '@/ui/components';

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
        <div className="os-root min-h-screen bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))] flex flex-col md:flex-row">
            {/* Sidebar / Topbar */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] flex flex-col">
                <div className="p-4 border-b border-[hsl(var(--ui-border))] flex flex-col gap-3 shrink-0">
                    <div className="flex justify-center pt-2 pb-1">
                        <CondstoreLogo size="md" />
                    </div>
                    {tenantId && (
                        <span className="text-[11px] text-[hsl(var(--ui-text-muted))] truncate max-w-[180px] leading-tight flex justify-center">
                            Setor: {tenantId}
                        </span>
                    )}
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <AppNav role={role} tenantId={tenantId} />
                </div>
            </aside>

            {/* Main view */}
            <main className="flex-1 flex flex-col min-h-0 bg-[hsl(var(--ui-bg))]">
                <header className="h-14 border-b border-[hsl(var(--ui-border))] px-4 flex items-center justify-between bg-[hsl(var(--ui-surface))] shrink-0 sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-3">
                        <ModuleBreadcrumb />
                        <InspectBadge role={role} />
                    </div>
                    <ThemeToggle />
                </header>
                <div className="flex-1 overflow-y-auto w-full">
                    {tenantId && <FinOpsStatusBar tenantId={tenantId} />}
                    <div className="px-4 py-6 md:px-8 md:py-8">
                        <div className="mx-auto max-w-[var(--container-max-width)] w-full">
                            {children}
                        </div>
                    </div>
                </div>
            </main >
        </div >
    );
}
