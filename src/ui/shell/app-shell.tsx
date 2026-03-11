import * as React from 'react';
import { AppNav } from './app-nav';
import { type Role } from '@/ui/auth/entitlements-logic';
import { ThemeToggle } from '@/ui/theme';
import { InspectBadge } from './inspect-badge';
import { FinOpsStatusBar } from './finops-status-bar';
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
        <div className="os-root min-h-screen bg-[hsl(var(--ui-bg))] text-[hsl(var(--ui-text))]">
            <div className="flex min-h-screen flex-col md:flex-row">
                <aside className="w-full shrink-0 border-b border-[hsl(var(--ui-border))] bg-[linear-gradient(180deg,hsl(var(--ui-surface))_0%,hsl(var(--ui-page))_100%)] md:sticky md:top-0 md:h-screen md:w-[22rem] md:border-b-0 md:border-r">
                    <div className="flex h-full flex-col">
                        <div className="border-b border-[hsl(var(--ui-border))] px-5 py-5">
                            <div className="flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm">
                                    <CondstoreLogo size="sm" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--ui-text-subtle))]">
                                        CONDSTORE OS
                                    </p>
                                    <p className="truncate text-sm font-semibold text-[hsl(var(--ui-text))]">
                                        Infraestrutura operacional premium
                                    </p>
                                </div>
                            </div>

                            <div className="mt-4 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.7)] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">
                                    Workspace ativo
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-[hsl(var(--ui-text))]">
                                            {tenantId ?? 'Tenant nao identificado'}
                                        </p>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">
                                            Shell unificado para operacao, inteligencia e governanca
                                        </p>
                                    </div>
                                    <ThemeToggle />
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 py-5">
                            <AppNav role={role} tenantId={tenantId} />
                        </div>

                        <div className="border-t border-[hsl(var(--ui-border))] px-5 py-4">
                            <p className="text-[11px] font-medium text-[hsl(var(--ui-text-muted))]">
                                Controle, velocidade, inteligencia e governanca em uma unica superficie.
                            </p>
                        </div>
                    </div>
                </aside>

                <main className="flex min-h-screen min-w-0 flex-1 flex-col bg-[hsl(var(--ui-bg))]">
                    <header className="sticky top-0 z-20 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface)/0.92)] backdrop-blur">
                        <div className="flex min-h-[4.5rem] items-center justify-between gap-4 px-4 py-3 md:px-6">
                            <div className="min-w-0">
                                <ModuleBreadcrumb />
                                <p className="mt-1 text-xs text-[hsl(var(--ui-text-muted))]">
                                    Fundacao consolidada para cockpit, operacao, clientes, pedidos, logistica, Frank e governanca.
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <InspectBadge role={role} />
                            </div>
                        </div>
                    </header>

                    {tenantId ? <FinOpsStatusBar tenantId={tenantId} /> : null}

                    <div className="flex-1 px-4 py-6 md:px-8 md:py-8">
                        <div className="mx-auto w-full max-w-[96rem]">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
