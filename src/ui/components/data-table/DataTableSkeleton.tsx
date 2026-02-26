import React from 'react';
import { cn } from '@/lib/utils';

interface DataTableSkeletonProps {
    columnCount?: number;
    rowCount?: number;
    className?: string;
}

export function DataTableSkeleton({
    columnCount = 5,
    rowCount = 5,
    className,
}: DataTableSkeletonProps) {
    return (
        <div className={cn("w-full overflow-hidden rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]", className)}>
            <div className="flex h-11 items-center border-b border-[hsl(var(--ui-border))] px-4 bg-[hsl(var(--ui-muted))] gap-4">
                {Array.from({ length: columnCount }).map((_, i) => (
                    <div key={`header-${i}`} className="h-4 w-full max-w-[120px] rounded-md bg-[hsl(var(--ui-border-strong))] animate-pulse" />
                ))}
            </div>
            <div className="divide-y divide-[hsl(var(--ui-border))]">
                {Array.from({ length: rowCount }).map((_, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex h-12 items-center px-4 gap-4">
                        {Array.from({ length: columnCount }).map((_, colIndex) => (
                            <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className="h-4 w-full rounded-md bg-[hsl(var(--ui-border))] animate-pulse"
                                style={{
                                    maxWidth: colIndex === 0 ? '80px' : colIndex === columnCount - 1 ? '60px' : '100%',
                                    opacity: 1 - rowIndex * 0.1
                                }}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex items-center justify-between border-t border-[hsl(var(--ui-border))] px-4 py-3">
                <div className="h-4 w-24 rounded bg-[hsl(var(--ui-border))] animate-pulse" />
                <div className="flex gap-2">
                    <div className="h-8 w-8 rounded bg-[hsl(var(--ui-border))] animate-pulse" />
                    <div className="h-8 w-8 rounded bg-[hsl(var(--ui-border))] animate-pulse" />
                </div>
            </div>
        </div>
    );
}
