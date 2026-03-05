import { cookies } from 'next/headers';
import { Construction, CheckCircle2, AlertCircle, ArrowRight, ChevronLeft, Link as LinkIcon, Database, HardDrive, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default async function MarcianoPlaceholderPage(props: { params: Promise<{ slug: string[] }>; searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const params = await props.params;
    const searchParams = await props.searchParams;

    // Evaluate TV mode
    const cookieStore = await cookies();
    const tvModeCookie = cookieStore.get('cs_tv');
    const isTvMode = searchParams.tv === '1' || tvModeCookie?.value === '1';

    // Parse sector
    const rawSlug = params.slug[0] || 'geral';
    const sectorName = rawSlug.charAt(0).toUpperCase() + rawSlug.slice(1);

    return (
        <main className={cn(
            "flex-1 overflow-y-auto bg-[hsl(var(--ui-background))]",
            isTvMode ? "p-6 sm:p-10" : "p-4 sm:p-6 lg:p-8"
        )}>
            <div className={cn(
                "mx-auto flex flex-col w-full transition-all duration-300",
                isTvMode ? "max-w-[1920px] gap-8" : "max-w-6xl gap-6"
            )}>
                {/* Header Section */}
                <header className="flex flex-col gap-4">
                    <Link href="/cockpit" className="group inline-flex items-center text-sm font-medium text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors w-fit">
                        <ChevronLeft className="mr-1 h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Voltar ao Cockpit
                    </Link>
                    <div>
                        <h1 className={cn(
                            "font-bold text-[hsl(var(--ui-text))] tracking-tight flex items-center gap-3",
                            isTvMode ? "text-3xl sm:text-5xl" : "text-2xl sm:text-3xl"
                        )}>
                            Setor: {sectorName}
                            <span className="inline-flex items-center rounded-md border border-[hsl(var(--ui-accent-blue)/0.2)] bg-[hsl(var(--ui-accent-blue)/0.1)] px-2.5 py-0.5 text-xs font-semibold tracking-wide text-[hsl(var(--ui-accent-blue))]">
                                Preview
                            </span>
                        </h1>
                        <p className={cn(
                            "text-[hsl(var(--ui-text-muted))]",
                            isTvMode ? "text-lg mt-2" : "text-sm mt-1"
                        )}>
                            Dashboard de amostra focado em usabilidade e TV-first. (Em Breve)
                        </p>
                    </div>
                </header>

                {/* KPI Cards (Empty State) */}
                <section className={cn("grid gap-4", isTvMode ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4")}>
                    {[
                        { label: 'Visitas Hoje', icon: BarChart3 },
                        { label: 'Eventos Grog', icon: Database },
                        { label: 'Saúde da API', icon: HardDrive },
                        { label: 'Total Faturado', icon: LinkIcon }
                    ].map((kpi, i) => (
                        <div key={i} className="p-5 sm:p-6 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm flex flex-col justify-between min-h-[140px] group transition-all hover:border-[hsl(var(--ui-accent-blue)/0.5)]">
                            <div className="flex items-center justify-between">
                                <span className={cn("font-medium text-[hsl(var(--ui-text-muted))]", isTvMode ? "text-lg" : "text-sm")}>{kpi.label}</span>
                                <kpi.icon className={cn("text-[hsl(var(--ui-text-muted))] opacity-50", isTvMode ? "w-6 h-6" : "w-5 h-5")} />
                            </div>
                            <div className="flex items-baseline gap-2">
                                <span className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-5xl" : "text-3xl")}>--</span>
                                <span className={cn("font-medium text-[hsl(var(--ui-text-muted))]", isTvMode ? "text-base" : "text-xs")}>Aguardando Fonte</span>
                            </div>
                        </div>
                    ))}
                </section>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Ações Rápidas */}
                    <section className="p-6 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-2xl" : "text-xl")}>Ações Rápidas</h2>
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-muted))]">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] flex items-center justify-center shrink-0">
                                        <Construction className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[hsl(var(--ui-text))]">Conectar Nova Fonte</p>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">Vincule seu ERP para habilitar os cards numéricos.</p>
                                    </div>
                                </div>
                                <ArrowRight className="w-5 h-5 text-[hsl(var(--ui-text-muted))] opacity-50 shrink-0" />
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-muted))] opacity-80">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] flex items-center justify-center shrink-0">
                                        <AlertCircle className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-[hsl(var(--ui-text))]">Relatórios Analíticos</p>
                                        <p className="text-xs text-[hsl(var(--ui-text-muted))]">Disponível em breve.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Status das Integrações */}
                    <section className="p-6 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] shadow-sm flex flex-col gap-4">
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className={cn("font-bold text-[hsl(var(--ui-text))] tracking-tight", isTvMode ? "text-2xl" : "text-xl")}>Saúde das Integrações</h2>
                        </div>
                        <div className="flex flex-col gap-0 divide-y divide-[hsl(var(--ui-border))] border border-[hsl(var(--ui-border))] rounded-xl overflow-hidden">
                            {[
                                { name: 'CONDSTORE Authenticator', status: 'online', dt: 'Sincronizado há 2m' },
                                { name: 'Domine Webhooks', status: 'pendente', dt: 'Nenhum evento recebido' },
                                { name: 'Painel Logístico Sync', status: 'online', dt: 'Online' },
                            ].map((integ, i) => (
                                <div key={i} className="flex items-center justify-between p-4 bg-[hsl(var(--ui-surface))]">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-[hsl(var(--ui-text))]">{integ.name}</span>
                                        <span className="text-xs text-[hsl(var(--ui-text-muted))]">{integ.dt}</span>
                                    </div>
                                    {integ.status === 'online' ? (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-xs font-medium">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            OK
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-medium">
                                            <AlertCircle className="w-3.5 h-3.5" />
                                            Aguardando
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}
