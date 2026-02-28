import * as React from 'react';
import { AppNav } from './app-nav';
import { type Role } from '@/ui/auth/entitlements-logic';
import { ThemeToggle } from '@/ui/theme';
import { InspectBadge } from './inspect-badge';
import { FinOpsStatusBar } from './finops-status-bar';
import { Box } from 'lucide-react';

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
        <div className="os-root min-h-screen bg-[var(--bg)] text-[var(--fg)] flex flex-col md:flex-row">
            {/* Sidebar / Topbar */}
            <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[hsl(var(--ui-border))] bg-[var(--surface)] flex flex-col">
                <div className="p-4 border-b border-[hsl(var(--ui-border))] flex items-center gap-2 shrink-0">
                    <Box className="h-5 w-5 text-[hsl(var(--ui-accent-blue))]" />
                    <div className="flex flex-col">
                        <span className="font-semibold text-[var(--fg)] tracking-tight">CONDSTORE OS</span>
                        {tenantId && (
                            <span className="text-[11px] text-[hsl(var(--ui-text-muted))] truncate max-w-[180px] leading-tight">
                                {tenantId}
                            </span>
                        )}
                    </div>
                </div>

                <div className="p-4 flex-1 overflow-y-auto">
                    <AppNav role={role} tenantId={tenantId} />
                </div>
            </aside>

            {/* Main view */}
            <main className="flex-1 flex flex-col min-h-0 bg-[var(--bg)]">
                <header className="h-14 border-b border-[hsl(var(--ui-border))] px-4 flex items-center justify-between bg-[var(--surface)] shrink-0 sticky top-0 z-10 w-full">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-[hsl(var(--ui-text-muted))] tracking-wide uppercase">Workspace</span>
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
            </main>
        </div>
    );
}
