import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface SettingsRowProps extends React.HTMLAttributes<HTMLDivElement> {
    label: React.ReactNode;
    description?: React.ReactNode;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    href?: string | any;
    external?: boolean;
    onClick?: () => void;
    showChevron?: boolean;
}

export function SettingsRow({
    label,
    description,
    value,
    icon,
    href,
    external,
    onClick,
    showChevron,
    className,
    children,
    ...props
}: SettingsRowProps) {
    const isClickable = !!href || !!onClick;

    const content = (
        <div
            className={cn(
                'group flex min-h-[4rem] items-center gap-4 px-4 py-3 transition-colors',
                isClickable && 'cursor-pointer hover:bg-[hsl(var(--ui-muted))] focus-visible:bg-[hsl(var(--ui-muted))]',
                className
            )}
            onClick={onClick}
            {...props}
        >
            {icon && (
                <div className="flex shrink-0 items-center justify-center text-[var(--fg)]/60 group-hover:text-[var(--fg)]">
                    {icon}
                </div>
            )}
            <div className="flex flex-1 flex-col py-1">
                <div className="text-[15px] font-medium text-[var(--fg)]">{label}</div>
                {description && (
                    <div className="mt-0.5 text-[13px] text-[var(--fg)]/70">
                        {description}
                    </div>
                )}
            </div>
            {(value || children || isClickable || showChevron) && (
                <div className="flex shrink-0 items-center gap-3">
                    {value && (
                        <div className="text-sm font-medium text-[var(--fg)]/60">
                            {value}
                        </div>
                    )}
                    {children}
                    {(showChevron || isClickable) && (
                        <ChevronRight className="h-5 w-5 text-[var(--border)] group-hover:text-[var(--fg)]/70" />
                    )}
                </div>
            )}
        </div>
    );

    if (href) {
        if (external) {
            return (
                <a href={href} className="block outline-none" target="_blank" rel="noopener noreferrer">
                    {content}
                </a>
            );
        }
        return (
            <Link href={href} className="block outline-none">
                {content}
            </Link>
        );
    }

    return content;
}
