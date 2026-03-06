import { Suspense } from 'react';
import { headers } from 'next/headers';
import { getVisibleTiles } from '@/modules/cockpit/launcher/tiles.service';
import { LauncherGrid } from '@/ui/components/cockpit/launcher/LauncherGrid';
import { TvToggle } from '@/ui/components/cockpit/launcher/TvToggle';
import { Role } from '@/ui/auth/entitlements-logic';
import { cn } from '@/lib/utils';
import { cookies } from 'next/headers';
import { getUserPinsAction } from '@/app/(app)/cockpit/funcionalidades/actions';
import { Settings, LayoutGrid, Home } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';

// Helper to map color names to Tailwind text-color utility classes for minimalist highlights
const colorToClass: Record<string, string> = {
    blue: 'text-blue-500 dark:text-blue-400',
    green: 'text-emerald-500 dark:text-emerald-400',
    red: 'text-rose-500 dark:text-rose-400',
    yellow: 'text-amber-500 dark:text-amber-400',
    purple: 'text-purple-500 dark:text-purple-400',
    emerald: 'text-emerald-500 dark:text-emerald-400',
    indigo: 'text-indigo-500 dark:text-indigo-400',
    teal: 'text-teal-500 dark:text-teal-400',
    amber: 'text-amber-500 dark:text-amber-400',
    slate: 'text-slate-500 dark:text-slate-400',
};

export default async function CockpitLauncherPage(props: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const searchParams = await props.searchParams;
    const inspectTenantId = typeof searchParams.tenantId === 'string' ? searchParams.tenantId : undefined;

    const headersList = await headers();
    const sessionTenantId = headersList.get('x-auth-tenant-id');
    const roleStr = headersList.get('x-auth-role') || 'viewer';

    const cookieStore = await cookies();
    const tvModeCookie = cookieStore.get('cs_tv');
    const isTvMode = searchParams.tv === '1' || tvModeCookie?.value === '1';

    const isSuperAdminUser = ['admin', 'owner'].includes(roleStr);
    const actAsSuperAdmin = isSuperAdminUser && inspectTenantId;
    const tenantId = actAsSuperAdmin ? inspectTenantId : sessionTenantId;

    if (!tenantId) {
        return <div>Tenant ID não encontrado.</div>;
    }

    const { salas } = await getVisibleTiles({
        tenantId,
        role: roleStr as Role
    });

    const isInternal = tenantId.startsWith('lojacond');

    // Fetch user preferences for pinned tiles
    let pinnedIds: string[] = [];
    try {
        pinnedIds = await getUserPinsAction();
    } catch (e) {
        // Fallback or ignore if no user context available
        pinnedIds = [];
    }

    const allTiles = salas.flatMap(s => s.tiles);
    const pinnedTiles = pinnedIds.map(id => allTiles.find(t => t.id === id)).filter(Boolean) as typeof allTiles;

    return (
        <main className={cn(
            "flex-1 flex flex-col lg:flex-row min-h-0 bg-[hsl(var(--ui-background))] overflow-hidden",
        )}>
            {/* Desktop / TV Sidebar for Pinned Features */}
            <aside className={cn(
                "hidden lg:flex flex-col border-r border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shrink-0",
                isTvMode ? "w-80 p-8" : "w-64 p-6"
            )}>
                <div className="flex items-center justify-between mb-8">
                    <h2 className={cn("font-bold text-[hsl(var(--ui-text))]", isTvMode ? "text-2xl" : "text-lg")}>
                        Suas Funcionalidades
                    </h2>
                    <Link href="/cockpit/funcionalidades" className="text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-brand))] transition-colors">
                        <Settings className={cn(isTvMode ? "w-8 h-8" : "w-5 h-5")} />
                    </Link>
                </div>

                {pinnedTiles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center text-[hsl(var(--ui-text-muted))] border border-dashed border-[hsl(var(--ui-border))] rounded-xl">
                        <LayoutGrid className={cn("mb-2 opacity-50", isTvMode ? "w-10 h-10" : "w-6 h-6")} />
                        <span className={cn(isTvMode ? "text-lg" : "text-sm")}>Nenhum módulo fixado.</span>
                        <Link href="/cockpit/funcionalidades" className={cn("text-[hsl(var(--ui-brand))] hover:underline mt-1", isTvMode ? "text-lg" : "text-xs")}>
                            Configurar
                        </Link>
                    </div>
                ) : (
                    <nav className="flex flex-col gap-3 overflow-y-auto">
                        {pinnedTiles.map(tile => {
                            const IconComponent = (LucideIcons as any)[tile.iconName] || LucideIcons.CircleHelp;
                            return (
                                <Link
                                    key={tile.id}
                                    href={tile.href}
                                    className="group relative flex flex-col p-4 sm:p-5 rounded-2xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] hover:border-[hsl(var(--ui-brand)/0.4)] hover:shadow-lg transition-all duration-300 ease-out hover:-translate-y-1 overflow-hidden"
                                >
                                    {/* Minimalist Hover Glow Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-brand)/0.03)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-out pointer-events-none" />

                                    <div className="flex items-start justify-between mb-4">
                                        <div className={cn(
                                            "flex h-12 w-12 items-center justify-center rounded-xl bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border-active))] shadow-sm transition-all duration-300 ease-out group-hover:bg-[hsl(var(--ui-surface-hover))]",
                                            "text-[hsl(var(--ui-text))]"
                                        )}>
                                            {IconComponent ? <IconComponent className="w-6 h-6 transition-transform duration-300 ease-out group-hover:scale-110" /> : <div className="w-6 h-6 border-2 border-dashed rounded-full" />}
                                        </div>
                                    </div>

                                    <div className="flex-1 flex flex-col">
                                        <h3 className={cn(
                                            "font-semibold text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-brand))] transition-colors duration-300 line-clamp-1",
                                            isTvMode ? "text-xl sm:text-2xl mb-2" : "text-base sm:text-lg mb-1"
                                        )}>
                                            {tile.label}
                                        </h3>
                                        <p className={cn(
                                            "text-[hsl(var(--ui-text-muted))] line-clamp-2",
                                            isTvMode ? "text-base sm:text-lg leading-relaxed" : "text-xs sm:text-sm leading-snug"
                                        )}>
                                            {tile.description}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })}
                    </nav>
                )}
            </aside>

            {/* Main Workspace Area */}
            <div className={cn(
                "flex-1 overflow-y-auto w-full",
                isTvMode ? "p-4 sm:p-8" : "p-4 sm:p-6 lg:p-8"
            )}>
                <div className={cn(
                    "mx-auto flex flex-col transition-all duration-300",
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

                        <div className="flex items-center gap-4">
                            <Link
                                href="/home"
                                className="hidden lg:flex items-center gap-2 text-sm font-medium text-[hsl(var(--ui-text-muted))] bg-[hsl(var(--ui-surface-hover))] px-3 py-2 rounded-md hover:bg-[hsl(var(--ui-border))] hover:text-[hsl(var(--ui-text))] transition-colors"
                                title="Voltar ao App"
                            >
                                <Home className="w-4 h-4" />
                                <span>Voltar ao App</span>
                            </Link>

                            {/* Mobile Pinned Header Link */}
                            <Link
                                href="/cockpit/funcionalidades"
                                className="lg:hidden flex items-center gap-2 text-sm font-medium text-[hsl(var(--ui-brand))] bg-[hsl(var(--ui-brand))]/10 px-3 py-2 rounded-md hover:bg-[hsl(var(--ui-brand))]/20 transition-colors"
                            >
                                <Settings className="w-4 h-4" />
                                <span>Configurar</span>
                            </Link>

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
            </div>
        </main>
    );
}

