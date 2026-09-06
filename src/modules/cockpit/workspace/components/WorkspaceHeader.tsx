'use client';

import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { StatusChip } from '@/ui/foundation';

export interface WorkspaceHeaderProps {
    isRealData: boolean;
    onRefresh?: () => void;
    isLoading?: boolean;
}

export function WorkspaceHeader({ isRealData, onRefresh, isLoading }: WorkspaceHeaderProps) {
    return (
        <header className="sticky top-0 z-30 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))/0.95] backdrop-blur px-4 sm:px-6 py-3">
            <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-[hsl(var(--ui-accent-blue-ink))] text-white flex items-center justify-center font-bold text-sm tracking-widest shadow-sm shrink-0">
                        CS
                    </div>
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-base font-bold text-[hsl(var(--ui-text))] tracking-tight">
                                Área de Trabalho Operacional
                            </h1>
                            <StatusChip
                                label={isRealData ? 'Operação em Tempo Real' : 'Modo Diagnóstico'}
                                tone={isRealData ? 'success' : 'warning'}
                            />
                        </div>
                        <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                            CONDSTORE OS — Fila de trabalho viva e contexto persistente
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <button
                        type="button"
                        aria-label="Abrir busca global e comandos (⌘K)"
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                        className="hidden md:flex items-center gap-2 bg-[hsl(var(--ui-page))] border border-[hsl(var(--ui-border))] rounded-lg px-3 py-1.5 text-xs text-[hsl(var(--ui-text-subtle))] w-64 shadow-inner hover:text-[hsl(var(--ui-text))] text-left transition-colors cursor-pointer"
                    >
                        <Search className="h-3.5 w-3.5" />
                        <span>Buscar conversa, pedido ou cotação...</span>
                        <kbd className="ml-auto font-mono text-[10px] bg-[hsl(var(--ui-surface))] border rounded px-1">⌘K</kbd>
                    </button>

                    {onRefresh && (
                        <button
                            type="button"
                            aria-label="Atualizar dados operacionais"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-2 text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-surface-hover))] rounded-lg border border-[hsl(var(--ui-border))] transition-colors disabled:opacity-50"
                            title="Atualizar dados operacionais"
                        >
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
