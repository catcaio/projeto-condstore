import Link from 'next/link';
import { cn } from '@/lib/utils';

interface CtaCta {
    label: string;
    href: string;
    variant?: 'primary' | 'secondary';
}

interface CTASectionProps {
    title: string;
    subtitle?: string;
    ctas: CtaCta[];
    className?: string;
}

export function CTASection({ title, subtitle, ctas, className }: CTASectionProps) {
    return (
        <section className={cn('relative py-20 md:py-32 overflow-hidden', className)}>
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-accent-blue)/0.04)] via-transparent to-[hsl(var(--ui-accent-blue)/0.02)] pointer-events-none" />
            <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--ui-accent-blue)/0.3)] to-transparent" />
            <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--ui-border)/0.5)] to-transparent" />

            <div className="relative z-10 mx-auto max-w-3xl px-6 lg:px-8 text-center flex flex-col items-center">
                <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-[hsl(var(--ui-text))] leading-[1.1]">
                    {title}
                </h2>
                {subtitle && (
                    <p className="mt-5 text-lg text-[hsl(var(--ui-text-muted))] leading-relaxed font-light max-w-xl">
                        {subtitle}
                    </p>
                )}
                <div className="flex flex-col sm:flex-row items-center gap-4 mt-10 w-full sm:w-auto">
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
            </div>
        </section>
    );
}
