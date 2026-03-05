import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getVisibleTiles } from '@/modules/cockpit/launcher/tiles.service';
import { LauncherGrid } from '@/ui/components/cockpit/launcher/LauncherGrid';
import { TvToggle } from '@/ui/components/cockpit/launcher/TvToggle';
import { Role } from '@/ui/auth/entitlements-logic';
import { cn } from '@/lib/utils';
import { cookies } from 'next/headers';

export default async function CockpitLauncherPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const roleStr = headersList.get('x-auth-role') || 'viewer';
    const activeUserName = headersList.get('x-auth-user-email') || 'Usuário';

    const cookieStore = await cookies();
    const tvModeCookie = cookieStore.get('cs_tv');
    // searchParams override cookie if present
    const isTvMode = searchParams.tv === '1' || tvModeCookie?.value === '1';

    // Simple admin assertion logic currently coupled to UI routes
    const isSuperAdminUser = ['admin', 'owner'].includes(roleStr);

    // guard
    const actAsSuperAdmin = isSuperAdminUser && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    // Retrieve RBAC layout
    const { salas } = await getVisibleTiles({
        tenantId,
        role: roleStr as Role
    });

    const isInternal = tenantId.startsWith('lojacond');

    return (
        <main className={cn(
            "flex-1 overflow-y-auto bg-[hsl(var(--ui-background))]",
            isTvMode ? "p-4 sm:p-8" : "p-4 sm:p-6 lg:p-8"
        )}>
            <div className={cn(
                "mx-auto flex flex-col w-full transition-all duration-300",
                isTvMode ? "max-w-[1920px] gap-8" : "max-w-6xl gap-6"
            )}>
                {/* Header Section */}
                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className={cn(
                            "font-bold text-[hsl(var(--ui-text))] tracking-tight",
                            isTvMode ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
                        )}>
                            Olá, Cockpit
                        </h1>
                        <p className={cn(
                            "text-[hsl(var(--ui-text-muted))]",
                            isTvMode ? "text-lg mt-2" : "text-sm mt-1"
                        )}>
                            {isInternal ? "Central de Monitoramento LOG (Admin)" : "Seu portal de módulos e aplicações"}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <TvToggle initialTvMode={isTvMode} />
                    </div>
                </header>

                {/* 3-KPI Stripe (Internal Only for now) */}
                {isInternal && (
                    <div className={cn(
                        "grid gap-4",
                        isTvMode ? "grid-cols-3 mb-4" : "grid-cols-1 sm:grid-cols-3 mb-2"
                    )}>
                        <div className="p-4 sm:p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Eventos Hoje</span>
                            <span className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-4xl" : "text-2xl")}>---</span>
                        </div>
                        <div className="p-4 sm:p-5 rounded-2xl border border-red-500/20 bg-red-500/5 shadow-sm flex flex-col gap-1 ring-1 ring-inset ring-red-500/10 dark:ring-red-500/20">
                            <span className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400">DLQ Pendente</span>
                            <span className={cn("font-bold text-red-700 dark:text-red-500 tracking-tight", isTvMode ? "text-4xl" : "text-2xl")}>0</span>
                        </div>
                        <div className="p-4 sm:p-5 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm flex flex-col gap-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--ui-text-muted))]">Cotações (24h)</span>
                            <span className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-4xl" : "text-2xl")}>---</span>
                        </div>
                    </div>
                )}

                {/* Launcher Grid */}
                <Suspense fallback={
                    <div className="flex w-full items-center justify-center p-24 text-[hsl(var(--ui-text-muted))]">
                        <div className="animate-pulse flex flex-col items-center gap-4">
                            <div className="w-12 h-12 rounded-full border-4 border-[hsl(var(--ui-accent-blue)/0.3)] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                            <span className="font-medium">Carregando módulos...</span>
                        </div>
                    </div>
                }>
                    <LauncherGrid salas={salas} tvMode={isTvMode} />
                </Suspense>
            </div>
        </main>
    );
}
