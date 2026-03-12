import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ArrowRight, BarChart3, Bot, Truck, Inbox } from 'lucide-react';

interface HeroCta {
    label: string;
    href: string;
    variant?: 'primary' | 'secondary';
}

interface HeroSectionProps {
    eyebrow?: string;
    title: React.ReactNode;
    subtitle: string;
    ctas?: HeroCta[];
    className?: string;
}

export function HeroSection({ eyebrow, title, subtitle, ctas = [], className }: HeroSectionProps) {
    return (
        <section className={cn('relative pt-20 pb-16 md:pt-32 md:pb-24 overflow-hidden', className)}>
            {/* Ambient glow */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-[hsl(var(--ui-accent-blue)/0.06)] blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-[hsl(var(--ui-accent-blue)/0.03)] blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 mx-auto max-w-[var(--container-max-width)] px-6 lg:px-8 text-center flex flex-col items-center">
                {eyebrow && (
                    <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] text-xs font-semibold uppercase tracking-[0.15em] text-[hsl(var(--ui-text-muted))] mb-8 backdrop-blur-sm">
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[hsl(var(--ui-accent-blue))] opacity-60" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[hsl(var(--ui-accent-blue))]" />
                        </span>
                        {eyebrow}
                    </div>
                )}

                <h1 data-testid="public-hero-title" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[hsl(var(--ui-text))] leading-[1.08] tracking-tight max-w-5xl">
                    {title}
                </h1>

                <p className="mt-6 md:mt-8 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-2xl leading-relaxed font-light">
                    {subtitle}
                </p>

                {ctas.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 md:mt-12 w-full sm:w-auto">
                        {ctas.map((cta, i) => (
                            <Link
                                key={cta.href}
                                href={cta.href}
                                {...(i === 0 && cta.variant !== 'secondary' ? { 'data-testid': 'public-primary-cta' } : {})}
                                className={cn(
                                    'inline-flex items-center justify-center gap-2 rounded-full text-sm font-bold transition-all w-full sm:w-auto',
                                    cta.variant === 'secondary'
                                        ? 'border border-[hsl(var(--ui-border))] bg-transparent text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-elevated))] h-12 px-8'
                                        : 'bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-lg shadow-[hsl(var(--ui-accent-blue)/0.2)] h-14 px-10 text-base'
                                )}
                            >
                                {cta.label}
                                {cta.variant !== 'secondary' && <ArrowRight className="h-4 w-4" />}
                            </Link>
                        ))}
                    </div>
                )}

                {/* Product Mockup Area */}
                <div className="mt-16 md:mt-20 w-full max-w-4xl mx-auto">
                    <div className="relative rounded-2xl border border-[hsl(var(--ui-border)/0.3)] bg-[hsl(var(--ui-surface)/0.3)] backdrop-blur-sm overflow-hidden shadow-2xl shadow-[hsl(var(--ui-accent-blue)/0.06)]">
                        {/* Window chrome */}
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.5)]">
                            <div className="flex gap-1.5">
                                <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-danger)/0.4)]" />
                                <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-warning)/0.4)]" />
                                <div className="w-3 h-3 rounded-full bg-[hsl(var(--ui-success)/0.4)]" />
                            </div>
                            <div className="flex-1 flex justify-center">
                                <div className="px-4 py-1 rounded-md bg-[hsl(var(--ui-surface-elevated)/0.5)] text-[10px] font-medium text-[hsl(var(--ui-text-subtle))]">
                                    app.condstore.com.br/cockpit
                                </div>
                            </div>
                        </div>

                        {/* Cockpit skeleton */}
                        <div className="p-6 md:p-8 grid grid-cols-4 gap-4 min-h-[200px] md:min-h-[280px]">
                            {/* Sidebar skeleton */}
                            <div className="hidden md:flex flex-col gap-3 col-span-1">
                                {[Inbox, Truck, BarChart3, Bot].map((Icon, i) => (
                                    <div key={i} className={cn(
                                        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                                        i === 0
                                            ? 'bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]'
                                            : 'text-[hsl(var(--ui-text-subtle))]'
                                    )}>
                                        <Icon className="h-4 w-4" />
                                        <span>{['Inbox', 'Envios', 'Métricas', 'Frank'][i]}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Content area skeleton */}
                            <div className="col-span-4 md:col-span-3 flex flex-col gap-4">
                                {/* Stat cards */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Pedidos hoje', value: '47' },
                                        { label: 'SLA ativo', value: '98.2%' },
                                        { label: 'Margem', value: 'R$ 3.4k' },
                                    ].map((stat) => (
                                        <div key={stat.label} className="rounded-xl border border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.3)] p-3 md:p-4">
                                            <span className="block text-[10px] md:text-xs text-[hsl(var(--ui-text-subtle))] mb-1">{stat.label}</span>
                                            <span className="block text-lg md:text-2xl font-bold text-[hsl(var(--ui-text))] tracking-tight">{stat.value}</span>
                                        </div>
                                    ))}
                                </div>

                                {/* Chart placeholder */}
                                <div className="flex-1 rounded-xl border border-[hsl(var(--ui-border)/0.2)] bg-[hsl(var(--ui-surface)/0.2)] p-4 flex items-end gap-1.5 min-h-[80px]">
                                    {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
                                        <div
                                            key={i}
                                            className="flex-1 rounded-sm bg-[hsl(var(--ui-accent-blue)/0.2)]"
                                            style={{ height: `${h}%` }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
