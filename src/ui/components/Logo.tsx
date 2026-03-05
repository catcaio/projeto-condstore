import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hideSubtitle?: boolean;
    className?: string;
}

export function CondstoreLogo({ size = 'md', hideSubtitle = false, className, ...props }: LogoProps) {
    // Scaling map for the container
    const sizeMap = {
        sm: 'scale-75',
        md: 'scale-100',
        lg: 'scale-110',
        xl: 'scale-150',
    };

    return (
        <div className={cn("flex items-center gap-3", sizeMap[size], className)} {...props}>
            {/* The Isometric Cube 'C' Cluster */}
            <div className="flex-shrink-0 relative w-12 h-12">
                <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                    {/* Definitions for gradients and cube paths */}
                    <defs>
                        <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--ui-accent-blue))" />
                            <stop offset="100%" stopColor="hsl(var(--ui-accent-blue-strong, 210, 100%, 30%))" />
                        </linearGradient>
                        <linearGradient id="darkGrad" x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--ui-text))" />
                            <stop offset="100%" stopColor="hsl(var(--ui-text-muted))" />
                        </linearGradient>
                    </defs>

                    <g strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        {/* Upper Right 'C' End (Light Blue) */}
                        <g transform="translate(68, 16)" stroke="hsl(var(--ui-accent-blue))">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Top Cube (Darker) */}
                        <g transform="translate(36, -2)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Middle Top Inner (Light Blue) */}
                        <g transform="translate(52, 26)" stroke="hsl(var(--ui-accent-blue))">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Far Left Top (Dark) */}
                        <g transform="translate(4, 26)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Center Spine (Dark) */}
                        <g transform="translate(20, 54)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Center Spine Upper (Dark) */}
                        <g transform="translate(20, 16)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Far Left Bottom (Dark) */}
                        <g transform="translate(4, 72)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Bottom Cube (Dark) */}
                        <g transform="translate(36, 88)" stroke="currentColor" className="text-[hsl(var(--ui-text))]">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Middle Bottom Inner (Light Blue) */}
                        <g transform="translate(52, 60)" stroke="hsl(var(--ui-accent-blue))">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>

                        {/* Lower Right 'C' End (Light Blue) */}
                        <g transform="translate(68, 72)" stroke="hsl(var(--ui-accent-blue))">
                            <path d="M20 5 L35 13 L35 30 L20 38 L5 30 L5 13 Z" />
                            <path d="M20 22 L35 13 M20 22 L5 13 M20 22 L20 38" />
                        </g>
                    </g>
                </svg>
            </div>

            {/* Typography Lockup */}
            <div className="flex flex-col justify-center">
                <div className="flex items-baseline tracking-tight">
                    <span className="font-bold text-[hsl(var(--ui-text))] text-2xl" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        CONDSTORE
                    </span>
                    <span className="font-bold text-[hsl(var(--ui-accent-blue))] text-2xl ml-1.5" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                        OS
                    </span>
                </div>
                {!hideSubtitle && (
                    <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-widest text-[hsl(var(--ui-text-muted))] mt-0.5">
                        Um complexo sem complexidade.
                    </span>
                )}
            </div>
        </div>
    );
}
