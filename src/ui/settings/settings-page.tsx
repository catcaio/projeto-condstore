import * as React from 'react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/ui/theme';

export interface SettingsPageProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    headerAction?: React.ReactNode;
}

export function SettingsPage({
    title,
    description,
    headerAction,
    children,
    className,
    ...props
}: SettingsPageProps) {
    return (
        <div className={cn('mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10', className)} {...props}>
            <header className="mb-8 flex items-end justify-between gap-4 border-b border-[hsl(var(--ui-border))] pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                        {title}
                    </h1>
                    {description && (
                        <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">
                            {description}
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-3">
                    {headerAction}
                    <ThemeToggle />
                </div>
            </header>

            <div className="space-y-10">
                {children}
            </div>
        </div>
    );
}
