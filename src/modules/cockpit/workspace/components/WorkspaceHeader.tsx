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
        <header className="sticky top-0 z-30 border-b border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))/0.92] backdrop-blur-md px-3 sm:px-6 py-2.5 transition-all">
            <div className="mx-auto max-w-7xl flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex items-center justify-center font-mono font-bold text-xs sm:text-sm tracking-wider shadow-sm shrink-0">
                        CS
                    </div>
                    <div className="min-w-0 flex flex-col justify-center">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <h1 className="text-xs sm:text-sm font-semibold text-[hsl(var(--ui-text))] tracking-tight truncate">
                                Área de Trabalho
                            </h1>
                            <StatusChip
                                label={isRealData ? 'Tempo Real' : 'Diagnóstico'}
                                tone={isRealData ? 'success' : 'warning'}
                            />
                        </div>
                        <p className="hidden md:block text-[11px] text-[hsl(var(--ui-text-subtle))] truncate mt-0.5">
                            CONDSTORE OS — Fila de trabalho viva e contexto persistente
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                        type="button"
                        aria-label="Abrir busca global e comandos (⌘K)"
                        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
                        className="flex items-center gap-2 bg-[hsl(var(--ui-page))] border border-[hsl(var(--ui-border))] rounded-md px-2.5 py-1.5 text-xs text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] hover:border-[hsl(var(--ui-text-subtle))] transition-all cursor-pointer shadow-2xs"
                    >
                        <Search className="h-3.5 w-3.5 text-[hsl(var(--ui-text-subtle))]" />
                        <span className="hidden md:inline">Buscar conversa, pedido ou cotação...</span>
                        <span className="md:hidden text-[11px] font-medium">Buscar</span>
                        <kbd className="hidden md:inline-block ml-auto font-mono text-[10px] bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] rounded px-1 text-[hsl(var(--ui-text-subtle))]">⌘K</kbd>
                    </button>

                    {onRefresh && (
                        <button
                            type="button"
                            aria-label="Atualizar dados operacionais"
                            onClick={onRefresh}
                            disabled={isLoading}
                            className="p-1.5 sm:p-2 text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))] hover:bg-[hsl(var(--ui-page))] rounded-md border border-[hsl(var(--ui-border))] transition-colors disabled:opacity-50"
                            title="Atualizar dados operacionais"
                        >
                            <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}
