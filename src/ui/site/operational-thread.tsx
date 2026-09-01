'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface OperationalThreadProps {
    className?: string;
    variant?: 'vertical' | 'horizontal' | 'branching';
    animated?: boolean;
}

export function OperationalThread({ className, variant = 'vertical', animated = true }: OperationalThreadProps) {
    if (variant === 'vertical') {
        return (
            <div className={cn('relative flex justify-center py-4 my-2 pointer-events-none', className)}>
                <div className="relative w-0.5 h-16 sm:h-24 bg-gradient-to-b from-[hsl(var(--ui-border)/0.3)] via-[hsl(var(--ui-text-muted)/0.4)] to-[hsl(var(--ui-border)/0.3)] rounded-full overflow-hidden">
                    {animated && (
                        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-transparent via-[hsl(var(--ui-text))] to-transparent animate-pulse" />
                    )}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-[hsl(var(--ui-text))] ring-4 ring-[hsl(var(--ui-page))]" />
            </div>
        );
    }

    if (variant === 'branching') {
        return (
            <div className={cn('relative w-full py-6 flex justify-center pointer-events-none', className)}>
                <svg className="w-full max-w-lg h-16 stroke-[hsl(var(--ui-border-strong))] fill-none" viewBox="0 0 400 60">
                    <path
                        d="M200 0 V 20 C 200 40, 100 30, 80 60 M 200 20 C 200 40, 300 30, 320 60 M 200 20 V 60"
                        strokeWidth="1.5"
                        strokeDasharray="4 4"
                    />
                    <circle cx="200" cy="20" r="4" className="fill-[hsl(var(--ui-text))]" />
                    <circle cx="80" cy="58" r="3" className="fill-[hsl(var(--ui-text-muted))]" />
                    <circle cx="200" cy="58" r="3" className="fill-[hsl(var(--ui-success))]" />
                    <circle cx="320" cy="58" r="3" className="fill-[hsl(var(--ui-text-muted))]" />
                </svg>
            </div>
        );
    }

    return (
        <div className={cn('relative w-full h-0.5 bg-gradient-to-r from-transparent via-[hsl(var(--ui-border-strong)/0.5)] to-transparent my-6 pointer-events-none', className)}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-[hsl(var(--ui-text))] ring-4 ring-[hsl(var(--ui-page))]" />
        </div>
    );
}
