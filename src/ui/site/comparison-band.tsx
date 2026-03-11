import { cn } from '@/lib/utils';

interface ComparisonSide {
    label: string;
    items: string[];
    tone: 'negative' | 'positive';
}

interface ComparisonBandProps {
    left: ComparisonSide;
    right: ComparisonSide;
    className?: string;
}

export function ComparisonBand({ left, right, className }: ComparisonBandProps) {
    return (
        <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8', className)}>
            <Side side={left} />
            <Side side={right} />
        </div>
    );
}

function Side({ side }: { side: ComparisonSide }) {
    const isNeg = side.tone === 'negative';

    return (
        <div
            className={cn(
                'rounded-2xl border p-6 md:p-8',
                isNeg
                    ? 'border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.03)]'
                    : 'border-[hsl(var(--ui-accent-blue)/0.2)] bg-[hsl(var(--ui-accent-blue)/0.03)]'
            )}
        >
            <h3
                className={cn(
                    'text-sm font-bold uppercase tracking-[0.15em] mb-5',
                    isNeg ? 'text-[hsl(var(--ui-danger))]' : 'text-[hsl(var(--ui-accent-blue))]'
                )}
            >
                {side.label}
            </h3>
            <ul className="space-y-3">
                {side.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-[hsl(var(--ui-text-muted))] leading-relaxed">
                        <span
                            className={cn(
                                'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                isNeg
                                    ? 'bg-[hsl(var(--ui-danger)/0.15)] text-[hsl(var(--ui-danger))]'
                                    : 'bg-[hsl(var(--ui-accent-blue)/0.15)] text-[hsl(var(--ui-accent-blue))]'
                            )}
                        >
                            {isNeg ? '✕' : '✓'}
                        </span>
                        {item}
                    </li>
                ))}
            </ul>
        </div>
    );
}
