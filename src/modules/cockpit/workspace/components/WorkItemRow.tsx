'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/ui/components';
import { StatusChip } from '@/ui/foundation';
import type { CockpitActionQueueItem } from '../../data/shared';

export interface WorkItemRowProps {
    item: CockpitActionQueueItem;
    isSelected: boolean;
    onSelect: (id: string) => void;
}

export function WorkItemRow({ item, isSelected, onSelect }: WorkItemRowProps) {
    return (
        <div
            onClick={() => onSelect(item.id)}
            className={`p-4 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isSelected
                    ? 'bg-[hsl(var(--ui-page))] border-l-4 border-l-[hsl(var(--ui-accent-blue-ink))]'
                    : 'hover:bg-[hsl(var(--ui-page))/0.5]'
            }`}
        >
            <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-[hsl(var(--ui-text))]">
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
                    <span className="text-[11px] font-mono text-[hsl(var(--ui-text-subtle))] bg-[hsl(var(--ui-page))] px-1.5 py-0.5 rounded">
                        {item.queue}
                    </span>
                    {item.threadContext?.stage && (
                        <span className="text-[10px] uppercase font-bold text-[hsl(var(--ui-accent-blue-ink))] bg-[hsl(var(--ui-accent-blue-ink))/0.1] px-1.5 py-0.5 rounded">
                            Etapa: {item.threadContext.stage}
                        </span>
                    )}
                </div>
                <p className="text-xs text-[hsl(var(--ui-text-subtle))]">
                    Aguardando: <strong className="text-[hsl(var(--ui-text))] font-medium">{item.waitingFor}</strong> • Aging: {item.age}
                </p>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs text-[hsl(var(--ui-text-subtle))] hidden md:inline">
                    {item.owner}
                </span>
                <Link href={item.href} onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant={isSelected ? 'primary' : 'secondary'}>
                        <span>Agir agora</span>
                        <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                </Link>
            </div>
        </div>
    );
}
