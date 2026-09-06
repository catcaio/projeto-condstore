'use client';

import React from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';
import type { CockpitActionQueueItem } from '../../data/shared';
import { WorkItemRow } from './WorkItemRow';

export interface WorkQueueProps {
    items: CockpitActionQueueItem[];
    activeItemId: string | null;
    onSelectItem: (id: string) => void;
}

export function WorkQueue({ items, activeItemId, onSelectItem }: WorkQueueProps) {
    return (
        <div className="bg-[hsl(var(--ui-surface))] rounded-xl border border-[hsl(var(--ui-border))] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-[hsl(var(--ui-border))] flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--ui-text-subtle))] flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-[hsl(var(--ui-accent-blue-ink))]" />
                    Fila Operacional Requerendo Atenção
                </h2>
                <span className="text-xs font-mono text-[hsl(var(--ui-text-subtle))]">
                    {items.length} itens ativos
                </span>
            </div>

            {items.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto" />
                    <div>
                        <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Tudo limpo nesta fila</p>
                        <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                            Nenhuma pendência prioritária no momento para a categoria selecionada.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="divide-y divide-[hsl(var(--ui-border))]">
                    {items.map((item) => (
                        <WorkItemRow
                            key={item.id}
                            item={item}
                            isSelected={activeItemId === item.id}
                            onSelect={onSelectItem}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
