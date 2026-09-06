'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/ui/components';
import { StatusChip } from '@/ui/foundation';
import type { CockpitActionQueueItem } from '../../data/shared';

export interface WorkItemRowProps {
    item: CockpitActionQueueItem;
    isSelected: boolean;
    onSelect: (id: string) => void;
    density?: 'compact' | 'comfortable';
}

export function WorkItemRow({ item, isSelected, onSelect, density = 'comfortable' }: WorkItemRowProps) {
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onSelect(item.id);
        }
    };

    const isCompact = density === 'compact';

    return (
        <div
            role="button"
            tabIndex={0}
            aria-selected={isSelected}
            onClick={() => onSelect(item.id)}
            onKeyDown={handleKeyDown}
            className={`transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ui-accent-blue-ink))] focus:ring-inset ${
                isCompact ? 'p-2.5 min-h-[44px]' : 'p-4 min-h-[56px]'
            } ${
                isSelected
                    ? 'bg-[hsl(var(--ui-page))] border-l-4 border-l-[hsl(var(--ui-accent-blue-ink))] shadow-xs'
                    : 'hover:bg-[hsl(var(--ui-page))/0.6]'
            }`}
        >
            <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[hsl(var(--ui-text))] truncate max-w-[220px] sm:max-w-none">
                        {item.entity}
                    </span>
                    <StatusChip
                        label={item.priority}
                        tone={
                            item.priority === 'critical'
                                ? 'critical'
                                : item.priority === 'warning'
                                ? 'warning'
                                : 'info'
                        }
                    />
                    <span className="text-[10px] font-mono text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] px-2 py-0.5 rounded border border-[hsl(var(--ui-border))]">
                        {item.queue}
                    </span>
                    {item.operationalThread.activeStage && (
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--ui-accent-blue-ink))] bg-[hsl(var(--ui-accent-blue-ink))/0.1] px-2 py-0.5 rounded border border-[hsl(var(--ui-accent-blue-ink))/0.2]">
                            Etapa: {item.operationalThread.activeStage}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[hsl(var(--ui-text-subtle))] flex-wrap">
                    <span>
                        Aguardando: <strong className="text-[hsl(var(--ui-text))] font-medium">{item.waitingFor}</strong>
                    </span>
                    <span className="text-[hsl(var(--ui-border))]">•</span>
                    <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="h-3 w-3 shrink-0" />
                        {item.age}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                <span className="text-xs text-[hsl(var(--ui-text-subtle))] hidden md:inline">
                    {item.owner}
                </span>
                <Link href={item.href} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant={isSelected ? 'primary' : 'secondary'} className="min-h-[38px]">
                        <span>Agir</span>
                        <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}
