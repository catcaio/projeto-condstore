'use client';

import * as React from 'react';
import { VisibleSala } from '@/modules/cockpit/launcher/tiles.service';
import { Tile } from './Tile';

export function SalaSection({ sala }: { sala: VisibleSala }) {
    if (sala.tiles.length === 0) return null;

    return (
        <section className="flex flex-col gap-4 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={{ animationDelay: `${sala.order * 2}ms` }}>
            <div className="flex items-center gap-4 px-2 sm:px-4">
                <h2 className="text-lg font-semibold text-[hsl(var(--ui-text))] tracking-tight">
                    {sala.label}
                </h2>
                <div className="h-px flex-1 bg-[hsl(var(--ui-border))] opacity-50" />
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-2 gap-y-6 sm:gap-6">
                {sala.tiles.map((tile) => (
                    <Tile key={tile.id} tile={tile} />
                ))}
            </div>
        </section>
    );
}
