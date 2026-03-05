'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { Tile } from './Tile';
import { cn } from '@/lib/utils';

export function SalaSection({ sala, tvMode = false }: { sala: VisibleSala; tvMode?: boolean }) {
    if (sala.tiles.length === 0) return null;

    return (
        <section className="flex flex-col gap-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${sala.order * 2}ms` }}>
            <div className="flex items-center gap-4 px-2 sm:px-4">
                <h2 className={cn(
                    "font-semibold text-[hsl(var(--ui-text))] tracking-tight transition-all",
                    tvMode ? "text-xl sm:text-2xl" : "text-lg"
                )}>
                    {sala.label}
                </h2>
                <div className="h-px flex-1 bg-[hsl(var(--ui-border))] opacity-50" />
            </div>

            <div className={cn(
                "grid gap-x-2 gap-y-6 sm:gap-6",
                tvMode
                    ? "grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10" // High density for TV
                    : "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"                // Standard density
            )}>
                {sala.tiles.map((tile) => (
                    <Tile key={tile.id} tile={tile} tvMode={tvMode} />
                ))}
            </div>
        </section>
    );
}
