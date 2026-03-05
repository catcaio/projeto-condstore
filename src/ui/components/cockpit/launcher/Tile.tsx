'use client';

import * as React from 'react';
import Link from 'next/link';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';
import { CockpitTile } from '@/modules/cockpit/launcher/tiles.registry';

export function Tile({ tile, tvMode = false }: { tile: CockpitTile; tvMode?: boolean }) {
    // Dynamically resolve the icon from lucide-react (fallback to Hexagon if not found)
    const IconComponent = (LucideIcons as any)[tile.iconName] || LucideIcons.Hexagon;

    return (
        <Link
            href={tile.href}
            className={cn(
                "group flex flex-col items-center justify-start gap-3 p-3 text-center",
                "rounded-2xl transition-all duration-200 outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ui-accent-blue))] focus-visible:ring-offset-2",
                "hover:bg-[hsl(var(--ui-accent-blue)/0.05)]"
            )}
            aria-label={`Abrir ${tile.label}`}
            title={tile.description}
        >
            <div
                className={cn(
                    "relative flex items-center justify-center flex-shrink-0 transition-all duration-200 ease-out",
                    "rounded-[20px] shadow-sm ring-1 ring-inset ring-[hsl(var(--ui-border))]",
                    "bg-[hsl(var(--ui-surface))] dark:bg-[hsl(var(--ui-surface))]",
                    "group-hover:scale-105 group-hover:shadow-md group-hover:ring-[hsl(var(--ui-accent-blue)/0.3)]",
                    "group-active:scale-95 group-active:shadow-inner",
                    tvMode
                        ? "w-24 h-24 sm:w-28 sm:h-28" // TV Mode size
                        : "w-16 h-16 sm:w-20 sm:h-20"   // Standard size
                )}
            >
                <IconComponent
                    className={cn(
                        "text-[hsl(var(--ui-accent-blue))] transition-colors duration-200 group-hover:text-[hsl(var(--ui-accent-blue-hover))]",
                        tvMode
                            ? "w-10 h-10 sm:w-14 sm:h-14" // Insignia larger on TV
                            : "w-8 h-8 sm:w-10 sm:h-10"     // Standard insignia
                    )}
                    strokeWidth={tvMode ? 1.25 : 1.5}
                />

                {tile.badge && (
                    <span
                        className={cn(
                            "absolute -top-2 -right-2 px-2 py-0.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full shadow-sm text-white",
                            tile.badge.type === 'danger' ? "bg-red-600 dark:bg-red-500" :
                                tile.badge.type === 'new' ? "bg-green-600 dark:bg-green-500" :
                                    tile.badge.type === 'beta' ? "bg-blue-600 dark:bg-blue-500" :
                                        "bg-[hsl(var(--ui-accent-blue))]"
                        )}
                    >
                        {tile.badge.label}
                    </span>
                )}
            </div>

            <div className="flex flex-col items-center max-w-full">
                <span className={cn(
                    "font-medium tracking-tight text-[hsl(var(--ui-text))] leading-tight line-clamp-2",
                    tvMode
                        ? "text-sm sm:text-base mt-1" // Slightly larger root text for TV
                        : "text-xs sm:text-sm"
                )}>
                    {tile.label}
                </span>
                {tvMode && tile.description && (
                    <span className="text-[10px] sm:text-xs text-[hsl(var(--ui-text-muted))] mt-1 line-clamp-1 opacity-80 hidden md:block">
                        {tile.description}
                    </span>
                )}
            </div>
        </Link>
    );
}
