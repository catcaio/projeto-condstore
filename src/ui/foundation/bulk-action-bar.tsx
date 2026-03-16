'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface BulkActionBarProps {
    selectedCount: number;
    onClearSelection: () => void;
    children: React.ReactNode;
    className?: string;
}

export function BulkActionBar({
    selectedCount,
    onClearSelection,
    children,
    className
}: BulkActionBarProps) {
    if (selectedCount === 0) return null;

    return (
        <div className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300",
            className
        )}>
            <div className="flex items-center gap-4 rounded-full border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] px-4 py-2 shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
                <div className="flex items-center gap-2 border-r border-[hsl(var(--ui-border))] pr-4">
                    <span className="flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[hsl(var(--ui-primary))] px-2 text-xs font-bold text-[hsl(var(--ui-primary-ink))]">
                        {selectedCount}
                    </span>
                    <span className="text-sm font-medium text-[hsl(var(--ui-text))]">
                        {selectedCount === 1 ? 'item selecionado' : 'itens selecionados'}
                    </span>
                    <button
                        onClick={onClearSelection}
                        className="ml-1 rounded-full p-1 text-[hsl(var(--ui-text-muted))] hover:bg-[hsl(var(--ui-muted))] hover:text-[hsl(var(--ui-text))] transition-colors"
                        aria-label="Limpar selecao"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    {children}
                </div>
            </div>
        </div>
    );
}
