import * as React from 'react';
import { cn } from '@/lib/utils';

export type CondstoreLogoVariant = 'legacy' | 'v1' | 'v2' | 'v3' | 'mono';
export type CondstoreLogoLayout = 'horizontal' | 'vertical' | 'symbol-only';

export interface LogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    hideSubtitle?: boolean;
    hideText?: boolean;
    /**
     * Variante do símbolo:
     * - 'legacy': Identidade em produção atual (cubo isométrico 'C' cluster). Padrão enquanto não houver homologação.
     * - 'v1': Candidata 1 (Matriz Conectada 2x2)
     * - 'v2': Candidata 2 (Nó Contínuo Tri-módulo)
     * - 'v3': Candidata 3 (Módulos de Expansão / Fio Contínuo)
     * - 'mono': Variante monocromática pura (sem cor nem CSS vars)
     */
    variant?: CondstoreLogoVariant;
    layout?: CondstoreLogoLayout;
    badgeOs?: boolean;
    className?: string;
}

export function CondstoreSymbol({
    variant = 'legacy',
    className,
}: {
    variant?: CondstoreLogoVariant;
    className?: string;
}) {
    if (variant === 'legacy') {
        return (
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={cn('w-full h-full drop-shadow-sm', className)} role="img" aria-label="Símbolo CONDSTORE OS">
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
                <path d="M 80,30 A 40,40 0 1,0 80,70" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className="text-[hsl(var(--ui-text))]" opacity="0.9" />
                <circle cx="65" cy="50" r="14" fill="url(#bluGrad)" />
                <circle cx="65" cy="50" r="24" fill="url(#glowGrad)" />
                <path d="M 65,50 L 80,30" stroke="url(#bluGrad)" strokeWidth="4" strokeLinecap="round" />
                <path d="M 65,50 L 80,70" stroke="url(#bluGrad)" strokeWidth="4" strokeLinecap="round" />
                <circle cx="80" cy="30" r="4" fill="currentColor" className="text-[hsl(var(--ui-text))]" />
                <circle cx="80" cy="70" r="4" fill="currentColor" className="text-[hsl(var(--ui-text))]" />
            </svg>
        );
    }

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
                <defs>
                    <mask id="condstore-mono-mask-symbol" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
                        <rect width="100" height="100" fill="white" />
                        <circle cx="70.5" cy="29.5" r="7" fill="black" />
                        <circle cx="70.5" cy="29.5" r="3" fill="white" />
                    </mask>
                </defs>
                <rect x="14" y="14" width="31" height="31" rx="9" fill="currentColor" />
                <rect x="55" y="14" width="31" height="31" rx="9" fill="currentColor" mask="url(#condstore-mono-mask-symbol)" />
                <rect x="14" y="55" width="31" height="31" rx="9" fill="currentColor" />
                <rect x="55" y="55" width="31" height="31" rx="9" fill="currentColor" />
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

    // Candidata 1 (V1) — Nó Modular 2×2 (Harmonizada milimetricamente com SVG estático)
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
    variant = 'legacy',
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
                                fontFamily: "var(--font-family-brand, 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif)",
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
                                    fontFamily: "var(--font-family-brand, 'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif)",
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
