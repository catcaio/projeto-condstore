import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface ModuleItem {
    icon: LucideIcon;
    name: string;
    tagline: string;
    description: string;
    accentClass?: string;
}

interface ModuleGridProps {
    modules: ModuleItem[];
    className?: string;
}

export function ModuleGrid({ modules, className }: ModuleGridProps) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5', className)}>
            {modules.map((mod) => {
                const Icon = mod.icon;
                const accent = mod.accentClass || 'text-[hsl(var(--ui-accent-blue))]';
                const accentBg = accent.replace('text-', 'bg-').replace(')]', '/0.1)]');

                return (
                    <div
                        key={mod.name}
                        className="group flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.4)] bg-[hsl(var(--ui-surface)/0.4)] p-6 md:p-7 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                    >
                        <div className="flex items-center gap-3">
                            <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', accentBg)}>
                                <Icon className={cn('h-5 w-5', accent)} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                    {mod.name}
                                </h3>
                                <span className={cn('text-[11px] font-semibold uppercase tracking-wider', accent)}>
                                    {mod.tagline}
                                </span>
                            </div>
                        </div>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            {mod.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
