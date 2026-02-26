import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/components/button';

interface DataTableEmptyProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function DataTableEmpty({
    title = 'Nenhum dado encontrado',
    description = 'Não há registros disponíveis para os filtros selecionados.',
    actionLabel = 'Limpar Filtros',
    onAction,
    className,
}: DataTableEmptyProps) {
    return (
        <div className={cn("flex flex-col items-center justify-center p-8 text-center min-h-[300px] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] rounded-md", className)}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] mb-4">
                <svg
                    className="h-6 w-6 text-[hsl(var(--ui-text-muted))]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                </svg>
            </div>
            <h3 className="text-sm font-medium text-[hsl(var(--ui-text))]">{title}</h3>
            <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))] max-w-[280px]">
                {description}
            </p>
            {onAction && actionLabel && (
                <div className="mt-6">
                    <Button variant="secondary" size="sm" onClick={onAction}>
                        {actionLabel}
                    </Button>
                </div>
            )}
        </div>
    );
}
