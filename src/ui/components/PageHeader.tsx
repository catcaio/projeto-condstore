import React, { ReactNode } from 'react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 mb-6 border-b border-[hsl(var(--ui-border)/0.5)]">
            <div className="space-y-1.5">
                <h1 className="text-2xl font-bold tracking-tight text-[hsl(var(--ui-text))]">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-sm font-medium text-[hsl(var(--ui-text-muted))]">
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex shrink-0 items-center justify-start md:justify-end gap-3">
                    {actions}
                </div>
            )}
        </div>
    );
}
