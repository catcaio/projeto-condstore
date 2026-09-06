'use client';

import React from 'react';
import { Zap } from 'lucide-react';
import type { WorkItemCategory } from '../../data/shared';

export interface WorkspaceFiltersProps {
    selectedCategory: WorkItemCategory | 'all';
    onSelectCategory: (cat: WorkItemCategory | 'all') => void;
    totalCount: number;
}

export function WorkspaceFilters({ selectedCategory, onSelectCategory, totalCount }: WorkspaceFiltersProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[hsl(var(--ui-surface))] p-3 rounded-xl border border-[hsl(var(--ui-border))] shadow-sm">
            {/* Mobile Queue Selector Dropdown */}
            <div className="sm:hidden w-full">
                <label htmlFor="mobile-queue-select" className="sr-only">Filtrar fila operacional</label>
                <select
                    id="mobile-queue-select"
                    value={selectedCategory}
                    onChange={(e) => onSelectCategory(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-[hsl(var(--ui-page))] border border-[hsl(var(--ui-border))] rounded-lg p-2 text-[hsl(var(--ui-text))]"
                >
                    <option value="all">Todas as Filas ({totalCount})</option>
                    <option value="conversation">Conversas & WhatsApp</option>
                    <option value="freight">Cotações de Frete</option>
                    <option value="order">Esteira de Pedidos</option>
                    <option value="exception">Exceções Operacionais</option>
                </select>
            </div>

            {/* Desktop Filter Tabs */}
            <div className="hidden sm:flex items-center gap-1 overflow-x-auto">
                <button
                    type="button"
                    onClick={() => onSelectCategory('all')}
                    aria-label="Mostrar todas as filas"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === 'all'
                            ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                            : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                    }`}
                >
                    Todas as Filas ({totalCount})
                </button>
                <button
                    type="button"
                    onClick={() => onSelectCategory('conversation')}
                    aria-label="Filtrar por conversas e WhatsApp"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === 'conversation'
                            ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                            : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                    }`}
                >
                    Conversas & WhatsApp
                </button>
                <button
                    type="button"
                    onClick={() => onSelectCategory('freight')}
                    aria-label="Filtrar por cotações de frete"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === 'freight'
                            ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                            : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                    }`}
                >
                    Cotações de Frete
                </button>
                <button
                    type="button"
                    onClick={() => onSelectCategory('order')}
                    aria-label="Filtrar por esteira de pedidos"
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                        selectedCategory === 'order'
                            ? 'bg-[hsl(var(--ui-page))] text-[hsl(var(--ui-text))] border border-[hsl(var(--ui-border))] shadow-xs'
                            : 'text-[hsl(var(--ui-text-subtle))] hover:text-[hsl(var(--ui-text))]'
                    }`}
                >
                    Esteira de Pedidos
                </button>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-[hsl(var(--ui-text-subtle))]">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span>Ação antes de navegação</span>
            </div>
        </div>
    );
}
