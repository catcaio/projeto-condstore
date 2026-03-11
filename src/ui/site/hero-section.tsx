import Link from 'next/link';
import { cn } from '@/lib/utils';

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

                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-[hsl(var(--ui-text))] leading-[1.08] tracking-tight max-w-5xl">
                    {title}
                </h1>

                <p className="mt-6 md:mt-8 text-lg md:text-xl text-[hsl(var(--ui-text-muted))] max-w-2xl leading-relaxed font-light">
                    {subtitle}
                </p>

                {ctas.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 md:mt-12 w-full sm:w-auto">
                        {ctas.map((cta) => (
                            <Link
                                key={cta.href}
                                href={cta.href}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-full text-sm font-bold transition-all h-12 px-8 w-full sm:w-auto',
                                    cta.variant === 'secondary'
                                        ? 'border border-[hsl(var(--ui-border))] bg-transparent text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-elevated))]'
                                        : 'bg-[hsl(var(--ui-accent-blue))] text-white hover:bg-[hsl(var(--ui-accent-blue-strong))] shadow-lg shadow-[hsl(var(--ui-accent-blue)/0.15)]'
                                )}
                            >
                                {cta.label}
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
}
