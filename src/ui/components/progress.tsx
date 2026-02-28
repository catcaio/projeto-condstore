import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: number;
    max?: number;
    indicatorClassName?: string;
}

export const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
    ({ className, value = 0, max = 100, indicatorClassName, ...props }, ref) => {
        const safeValue = Math.min(Math.max(value, 0), max);
        const percentage = (safeValue / max) * 100;

        return (
            <div
                ref={ref}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={max}
                aria-valuenow={safeValue}
                className={cn(
                    'relative h-2 w-full overflow-hidden rounded-full bg-[hsl(var(--ui-muted))]',
                    className
                )}
                {...props}
            >
                <div
                    className={cn(
                        'h-full w-full flex-1 bg-[hsl(var(--ui-accent-blue))] transition-all duration-300 ease-in-out',
                        indicatorClassName
                    )}
                    style={{ transform: `translateX(-${100 - percentage}%)` }}
                />
            </div>
        );
    }
);

Progress.displayName = 'Progress';
