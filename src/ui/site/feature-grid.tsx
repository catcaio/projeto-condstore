import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface FeatureItem {
    icon: LucideIcon;
    title: string;
    description: string;
}

interface FeatureGridProps {
    items: FeatureItem[];
    columns?: 2 | 3 | 4;
    className?: string;
}

const colsMap = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-2 lg:grid-cols-3',
    4: 'md:grid-cols-2 lg:grid-cols-4',
};

export function FeatureGrid({ items, columns = 3, className }: FeatureGridProps) {
    return (
        <div className={cn('grid grid-cols-1 gap-6', colsMap[columns], className)}>
            {items.map((item) => {
                const Icon = item.icon;
                return (
                    <div
                        key={item.title}
                        className="group relative flex flex-col gap-4 rounded-2xl border border-[hsl(var(--ui-border)/0.5)] bg-[hsl(var(--ui-surface)/0.5)] p-6 md:p-8 transition-all hover:border-[hsl(var(--ui-border))] hover:bg-[hsl(var(--ui-surface-elevated)/0.5)]"
                    >
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--ui-accent-blue)/0.1)] text-[hsl(var(--ui-accent-blue))]">
                            <Icon className="h-5 w-5" />
                        </div>
                        <h3 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                            {item.title}
                        </h3>
                        <p className="text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                            {item.description}
                        </p>
                    </div>
                );
            })}
        </div>
    );
}
