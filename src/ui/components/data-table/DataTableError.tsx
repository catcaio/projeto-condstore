import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/button';
import { ShieldAlert } from 'lucide-react';

interface DataTableErrorProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onRetry?: () => void;
    requestId?: string;
    className?: string;
}

export function DataTableError({
    title = 'Erro ao carregar dados',
    description = 'Tivemos um problema ao processar esta lista. Tente novamente em alguns instantes.',
    actionLabel = 'Tentar Novamente',
    onRetry,
    requestId,
    className,
}: DataTableErrorProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-red-500/20 bg-red-500/5 rounded-md", className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 mb-4">
                <ShieldAlert className="h-6 w-6 text-red-600 dark:text-red-500" />
            </div>

            <h3 className="text-sm font-medium text-[hsl(var(--ui-danger))] mb-1">
                {title}
            </h3>

            <p className="max-w-md text-sm text-[hsl(var(--ui-text-muted))] mb-2">
                {description}
            </p>

            {requestId && (
                <div className="mt-2 mb-6 rounded bg-[hsl(var(--ui-surface))] px-3 py-1.5 border border-[hsl(var(--ui-border))] font-mono text-[11px] text-[hsl(var(--ui-text-subtle))]">
                    Request ID: {requestId}
                </div>
            )}

            {onRetry && (
                <div className="mt-4">
                    <Button variant="secondary" size="sm" onClick={onRetry} className="border-red-500/20 hover:bg-red-500/10">
                        {actionLabel}
                    </Button>
                </div>
            )}
        </div>
    );
}
