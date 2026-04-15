'use client';

import * as React from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { CockpitTile } from '@/modules/cockpit/launcher/tiles.registry';

export function DashboardCard({ tile }: { tile: CockpitTile }) {
    const IconComponent = (LucideIcons as any)[tile.iconName] || LucideIcons.Hexagon;

    const cardContent = (
        <div
            className={cn(
                "group relative flex items-start gap-5 p-6 rounded-2xl border transition-all duration-300 ease-out overflow-hidden",
                "min-h-[120px]",
                "border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]",
                "hover:border-[hsl(var(--ui-brand)/0.35)] hover:shadow-lg hover:-translate-y-0.5",
                "active:translate-y-0 active:shadow-md"
            )}
        >
            {/* Subtle hover gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--ui-brand)/0.04)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

            {/* Icon container */}
            <div
                className={cn(
                    "flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ease-out",
                    "bg-[hsl(var(--ui-brand)/0.08)] text-[hsl(var(--ui-brand))] group-hover:bg-[hsl(var(--ui-brand)/0.12)] group-hover:scale-105"
                )}
            >
                <IconComponent className="w-6 h-6" strokeWidth={1.5} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3
                        className={cn(
                            "text-base font-semibold tracking-tight leading-tight truncate",
                            "text-[hsl(var(--ui-text))] group-hover:text-[hsl(var(--ui-brand))] transition-colors duration-300"
                        )}
                    >
                        {tile.label}
                    </h3>
                </div>
                {tile.description && (
                    <p
                        className={cn(
                            "text-sm leading-relaxed line-clamp-2",
                            "text-[hsl(var(--ui-text-muted))]"
                        )}
                    >
                        {tile.description}
                    </p>
                )}
            </div>

            {/* Arrow indicator */}
            <div className="flex-shrink-0 self-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-1 group-hover:translate-x-0">
                <LucideIcons.ChevronRight className="w-5 h-5 text-[hsl(var(--ui-text-muted))]" />
            </div>
        </div>
    );

    return (
        <Link href={tile.href} className="block outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-brand))] focus-visible:ring-offset-2 rounded-2xl">
            {cardContent}
        </Link>
    );
}

