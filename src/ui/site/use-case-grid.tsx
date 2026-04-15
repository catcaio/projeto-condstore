import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface UseCaseItem {
    icon: LucideIcon;
    title: string;
    description: string;
    problem: string;
    how: string;
    link?: { label: string; href: string };
    accentClass?: string;
}

interface UseCaseGridProps {
    useCases: UseCaseItem[];
    className?: string;
}

export function UseCaseGrid({ useCases, className }: UseCaseGridProps) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6', className)}>
            {useCases.map((uc) => {
                const Icon = uc.icon;
                const accent = uc.accentClass || 'text-[hsl(var(--ui-accent-blue))]';
                const accentBg = accent.replace('text-', 'bg-').replace(')]', '/0.1)]');

                return (
                    <div
                        key={uc.title}
                        className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6 md:p-7 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accentBg)}>
                                <Icon className={cn('h-5 w-5', accent)} />
                            </div>
                            <h3 className="text-lg font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                {uc.title}
                            </h3>
                        </div>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            {uc.description}
                        </p>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-[hsl(var(--ui-text))] uppercase tracking-wider">
                                Problema resolvido
                            </p>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                {uc.problem}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-[hsl(var(--ui-text))] uppercase tracking-wider">
                                Como o sistema atua
                            </p>
                            <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                                {uc.how}
                            </p>
                        </div>
                        {uc.link && (
                            <a
                                href={uc.link.href}
                                className={cn('inline-flex items-center gap-2 text-sm font-semibold', accent)}
                            >
                                {uc.link.label}
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </a>
                        )}
                    </div>
                );
            })}
        </div>
    );
}