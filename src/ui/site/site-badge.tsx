import { cn } from '@/lib/utils';

export type SiteBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent' | 'muted';

interface SiteBadgeProps {
    variant?: SiteBadgeVariant;
    className?: string;
    children: React.ReactNode;
}

// Issue #420: badge pill unificado. Receitas extraídas dos eyebadges da Home.
const variantClasses: Record<SiteBadgeVariant, string> = {
    default:
        'border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.6)] text-[hsl(var(--ui-text))]',
    success:
        'border-[hsl(var(--ui-success)/0.3)] bg-[hsl(var(--ui-success)/0.08)] text-[hsl(var(--ui-success))]',
    warning:
        'border-[hsl(var(--ui-warning)/0.3)] bg-[hsl(var(--ui-warning)/0.08)] text-[hsl(var(--ui-warning))]',
    danger:
        'border-[hsl(var(--ui-danger)/0.3)] bg-[hsl(var(--ui-danger)/0.08)] text-[hsl(var(--ui-danger))]',
    accent:
        'border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] text-[hsl(var(--ui-text-muted))]',
    muted: 'border-transparent bg-[hsl(var(--ui-muted)/0.6)] text-[hsl(var(--ui-text))]',
};

export function SiteBadge({ variant = 'default', className, children }: SiteBadgeProps) {
    return (
        <span
            className={cn(
                'inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold',
                variantClasses[variant],
                className
            )}
        >
            {children}
        </span>
    );
}
