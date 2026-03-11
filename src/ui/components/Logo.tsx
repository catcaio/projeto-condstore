import * as React from 'react';
import { cn } from '@/lib/utils';

interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hideSubtitle?: boolean;
    hideText?: boolean;
    className?: string;
}

export function CondstoreLogo({ size = 'md', hideSubtitle = false, hideText = false, className, ...props }: LogoProps) {
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
            <div className="flex-shrink-0 relative w-10 h-10">
                <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm">
                    <defs>
                        <linearGradient id="bluGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="hsl(var(--ui-accent-blue))" />
                            <stop offset="100%" stopColor="#0ea5e9" />
                        </linearGradient>
                        <linearGradient id="glowGrad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                            <stop offset="0%" stopColor="hsl(var(--ui-accent-blue))" stopOpacity="0.5" />
                            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
                        </linearGradient>
                    </defs>
                    
                    {/* Modern Abstract 'C' Node */}
                    <path d="M 80,30 A 40,40 0 1,0 80,70" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-[hsl(var(--ui-text))]" opacity="0.9" />
                    
                    {/* Glowing Core */}
                    <circle cx="65" cy="50" r="14" fill="url(#bluGrad)" />
                    <circle cx="65" cy="50" r="24" fill="url(#glowGrad)" />
                    
                    {/* Technical connections */}
                    <path d="M 65,50 L 80,30" stroke="url(#bluGrad)" strokeWidth="4" strokeLinecap="round" />
                    <path d="M 65,50 L 80,70" stroke="url(#bluGrad)" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="80" cy="30" r="4" fill="currentColor" className="text-[hsl(var(--ui-text))]" />
                    <circle cx="80" cy="70" r="4" fill="currentColor" className="text-[hsl(var(--ui-text))]" />
                </svg>
            </div>

            {/* Typography Lockup */}
            {!hideText && (
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
            )}
        </div>
    );
}
