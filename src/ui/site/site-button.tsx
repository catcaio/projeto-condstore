import Link from 'next/link';
import { cn } from '@/lib/utils';

export type SiteButtonVariant = 'primary' | 'secondary' | 'accent' | 'ghost';

interface SiteButtonProps {
    href: string;
    variant?: SiteButtonVariant;
    className?: string;
    children: React.ReactNode;
    testId?: string;
}

// Issue #420: variantes extraídas da Home (InteractiveHero + CTA final).
// `primary`/`secondary` reproduzem a receita h-13 rounded-xl da Home;
// `accent` reproduz o pill do header/footer; `ghost` o link narrativo.
const variantClasses: Record<SiteButtonVariant, string> = {
    primary:
        'inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[hsl(var(--ui-text))] px-7 text-sm font-bold text-[hsl(var(--ui-page))] shadow-md transition-all hover:opacity-90 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]',
    secondary:
        'inline-flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-xl border border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-surface)/0.5)] px-7 text-sm font-semibold text-[hsl(var(--ui-text))] transition-all hover:bg-[hsl(var(--ui-surface-elevated))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-text))]',
    accent:
        'inline-flex h-10 items-center justify-center rounded-full bg-[hsl(var(--ui-accent-blue))] px-5 text-sm font-bold text-[hsl(var(--ui-accent-blue-ink))] transition-all hover:bg-[hsl(var(--ui-accent-blue-strong))]',
    ghost:
        'inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))] transition-colors',
};

export function SiteButton({ href, variant = 'primary', className, children, testId }: SiteButtonProps) {
    return (
        <Link
            href={href}
            {...(testId ? { 'data-testid': testId } : {})}
            className={cn(variantClasses[variant], className)}
        >
            {children}
        </Link>
    );
}
