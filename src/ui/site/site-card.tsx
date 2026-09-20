import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export type SiteCardVariant = 'default' | 'elevated' | 'interactive';

interface SiteCardProps {
    variant?: SiteCardVariant;
    className?: string;
    children: React.ReactNode;
}

// Issue #420: card rounded-2xl unificado. `default`/`elevated` são
// superfícies estáticas; `interactive` reproduz o hover da FeatureGrid.
const variantClasses: Record<SiteCardVariant, string> = {
    default: 'border-[hsl(var(--ui-border)/0.6)] bg-[hsl(var(--ui-surface))] p-6 sm:p-8',
    elevated: 'border-[hsl(var(--ui-border)/0.7)] bg-[hsl(var(--ui-surface))] p-6 sm:p-10 shadow-lg',
    interactive:
        'border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]',
};

export function SiteCard({ variant = 'default', className, children }: SiteCardProps) {
    return <div className={cn('rounded-2xl border', variantClasses[variant], className)}>{children}</div>;
}

interface SiteFeatureCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    className?: string;
}

// Mesma linguagem do item da FeatureGrid, como primitivo nomeado.
export function SiteFeatureCard({ icon: Icon, title, description, className }: SiteFeatureCardProps) {
    return (
        <SiteCard variant="interactive" className={cn('group relative flex flex-col gap-4', className)}>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                <Icon className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">{title}</h3>
            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">{description}</p>
        </SiteCard>
    );
}
