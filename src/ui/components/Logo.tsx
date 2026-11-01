import * as React from 'react';
import { cn } from '@/lib/utils';

export type CondstoreLogoVariant = 'v1' | 'v2' | 'v3' | 'mono';
export type CondstoreLogoLayout = 'horizontal' | 'vertical' | 'symbol-only';

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hideSubtitle?: boolean;
    hideText?: boolean;
    variant?: CondstoreLogoVariant;
    layout?: CondstoreLogoLayout;
    badgeOs?: boolean;
    className?: string;
}

export function CondstoreSymbol({
    variant = 'v1',
    className,
}: {
    variant?: CondstoreLogoVariant;
    className?: string;
}) {
    if (variant === 'mono') {
        return (
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn('w-full h-full text-current', className)}
                role="img"
                aria-label="Símbolo CONDSTORE OS Monocromático"
            >
                <rect x="14" y="14" width="31" height="31" rx="9" fill="currentColor" />
                <rect x="55" y="14" width="31" height="31" rx="9" fill="currentColor" />
                <rect x="14" y="55" width="31" height="31" rx="9" fill="currentColor" />
                <rect x="55" y="55" width="31" height="31" rx="9" fill="currentColor" />
                <circle cx="70.5" cy="29.5" r="4.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
            </svg>
        );
    }

    if (variant === 'v2') {
        return (
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn('w-full h-full', className)}
                role="img"
                aria-label="Símbolo CONDSTORE OS Constelação Tri-nó"
            >
                <rect x="35" y="12" width="30" height="30" rx="8" fill="hsl(var(--ui-accent-blue))" />
                <rect x="15" y="52" width="30" height="30" rx="8" fill="currentColor" opacity="0.9" />
                <rect x="55" y="52" width="30" height="30" rx="8" fill="currentColor" opacity="0.8" />
                <circle cx="50" cy="52" r="5" fill="currentColor" opacity="0.4" />
            </svg>
        );
    }

    if (variant === 'v3') {
        return (
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={cn('w-full h-full', className)}
                role="img"
                aria-label="Símbolo CONDSTORE OS Fio Contínuo"
            >
                <path d="M 75 25 C 65 15, 35 15, 25 35 C 15 55, 15 65, 30 80 C 45 92, 70 88, 78 75" stroke="currentColor" strokeWidth="14" strokeLinecap="round" />
                <circle cx="75" cy="25" r="7" fill="hsl(var(--ui-accent-blue))" />
                <circle cx="78" cy="75" r="7" fill="currentColor" opacity="0.6" />
            </svg>
        );
    }

    // Default V1 — Nó Modular Contínuo (4 Quadrantes em Superelipse)
    return (
        <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn('w-full h-full', className)}
            role="img"
            aria-label="Símbolo CONDSTORE OS"
        >
            <rect x="14" y="14" width="31" height="31" rx="9" fill="currentColor" opacity="0.95" />
            <rect x="55" y="14" width="31" height="31" rx="9" fill="hsl(var(--ui-accent-blue))" />
            <circle cx="70.5" cy="29.5" r="4.5" fill="hsl(var(--ui-surface))" opacity="0.95" />
            <rect x="14" y="55" width="31" height="31" rx="9" fill="currentColor" opacity="0.95" />
            <rect x="55" y="55" width="31" height="31" rx="9" fill="currentColor" opacity="0.75" />
            <path
                d="M 45 29.5 L 55 29.5 M 29.5 45 L 29.5 55 M 55 70.5 L 45 70.5 M 70.5 55 L 70.5 45"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.25"
            />
        </svg>
    );
}

export function CondstoreLogo({
    size = 'md',
    hideSubtitle = false,
    hideText = false,
    variant = 'v1',
    layout = 'horizontal',
    badgeOs = false,
    className,
    ...props
}: LogoProps) {
    const isSymbolOnly = hideText || layout === 'symbol-only';
    const isVertical = layout === 'vertical' && !isSymbolOnly;

    // Dimensions map
    const symbolSizeMap = {
        sm: 'w-7 h-7',
        md: 'w-9 h-9',
        lg: 'w-11 h-11',
        xl: 'w-14 h-14',
    };

    const textSizeMap = {
        sm: 'text-lg',
        md: 'text-xl',
        lg: 'text-2xl',
        xl: 'text-3xl',
    };

    const osBadgeSizeMap = {
        sm: 'text-[10px] px-1.5 py-0.5',
        md: 'text-xs px-2 py-0.5',
        lg: 'text-xs px-2.5 py-0.5',
        xl: 'text-sm px-3 py-1',
    };

    return (
        <div
            className={cn(
                'inline-flex items-center text-[hsl(var(--ui-text))]',
                isVertical ? 'flex-col text-center gap-2' : 'gap-3',
                className
            )}
            {...props}
        >
            {/* Símbolo Modular */}
            <div className={cn('flex-shrink-0 relative transition-transform', symbolSizeMap[size])}>
                <CondstoreSymbol variant={variant} />
            </div>

            {/* Wordmark Tipográfico */}
            {!isSymbolOnly && (
                <div className={cn('flex flex-col justify-center min-w-0', isVertical ? 'items-center' : 'items-start')}>
                    <div className="flex items-center tracking-tight leading-none">
                        <span
                            className={cn('font-bold tracking-tight', textSizeMap[size])}
                            style={{
                                fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
                                letterSpacing: '-0.01em',
                            }}
                        >
                            CONDSTORE
                        </span>

                        {badgeOs ? (
                            <span
                                className={cn(
                                    'ml-2 rounded-md font-semibold tracking-wider uppercase border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-accent-blue))]',
                                    osBadgeSizeMap[size]
                                )}
                            >
                                OS
                            </span>
                        ) : (
                            <span
                                className={cn('font-medium text-[hsl(var(--ui-accent-blue))] ml-1.5', textSizeMap[size])}
                                style={{
                                    fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif",
                                    letterSpacing: '0.05em',
                                }}
                            >
                                OS
                            </span>
                        )}
                    </div>

                    {!hideSubtitle && (
                        <span className="text-[9px] sm:text-[10px] uppercase font-semibold tracking-widest text-[hsl(var(--ui-text-muted))] mt-1">
                            Um complexo sem complexidade.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
