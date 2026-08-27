import * as React from 'react';
import { cn } from '@/lib/utils';

interface AgilizapLogoProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: 'sm' | 'md' | 'lg';
    hideTagline?: boolean;
    className?: string;
}

export function AgilizapLogo({
    size = 'md',
    hideTagline = true,
    className,
    ...props
}: AgilizapLogoProps) {
    const sizeClasses = {
        sm: 'text-lg',
        md: 'text-xl md:text-2xl',
        lg: 'text-2xl md:text-3xl',
    };

    const iconSizeClasses = {
        sm: 'w-6 h-6',
        md: 'w-8 h-8',
        lg: 'w-9 h-9',
    };

    return (
        <div className={cn("inline-flex items-center gap-2.5 select-none", className)} {...props}>
            {/* Visual Icon: Minimalist Lightning Node */}
            <div className={cn("relative flex items-center justify-center rounded-lg bg-[#3E5CFF]/10 text-[#3E5CFF] border border-[#3E5CFF]/30 shrink-0", iconSizeClasses[size])}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
                    <path
                        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {/* Typography Lockup */}
            <div className="flex flex-col justify-center">
                <div className={cn("font-headline font-bold tracking-tight text-white flex items-center gap-1", sizeClasses[size])}>
                    <span>AGILIZAP</span>
                    <span className="w-2 h-2 rounded-full bg-[#3E5CFF] inline-block ml-0.5 animate-pulse" />
                </div>
                {!hideTagline && (
                    <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-medium">
                        Fluxo Comercial Contínuo
                    </span>
                )}
            </div>
        </div>
    );
}
