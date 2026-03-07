'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { DashboardCard } from './DashboardCard';
import { cn } from '@/lib/utils';

export function DashboardSection({ sala }: { sala: VisibleSala }) {
    if (sala.tiles.length === 0) return null;

    return (
        <section
            className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500 fill-mode-both"
            style={{ animationDelay: `${sala.order * 3}ms` }}
        >
            {/* Section header */}
            <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-[hsl(var(--ui-text-muted))]">
                    {sala.label}
                </h2>
                <div className="h-px flex-1 bg-[hsl(var(--ui-border))]" />
            </div>

            {/* Cards grid */}
            <div className={cn(
                "grid gap-4",
                "grid-cols-1 sm:grid-cols-2"
            )}>
                {sala.tiles.map((tile) => (
                    <DashboardCard key={tile.id} tile={tile} />
                ))}
            </div>
        </section>
    );
}
