import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/ui/components';

export interface SettingsSectionProps extends React.HTMLAttributes<HTMLDivElement> {
    title: string;
    description?: string;
    cardClassName?: string;
}

export function SettingsSection({
    title,
    description,
    children,
    className,
    cardClassName,
    ...props
}: SettingsSectionProps) {
    return (
        <section className={cn('scroll-m-20', className)} {...props}>
            <header className="mb-3 px-1">
                <h2 className="text-lg font-semibold tracking-tight text-[hsl(var(--ui-text))]">
                    {title}
                </h2>
                {description && (
                    <p className="text-sm text-[hsl(var(--ui-text-subtle))]">
                        {description}
                    </p>
                )}
            </header>
            <Card variant="grouped" className={cn('overflow-hidden rounded-xl', cardClassName)}>
                <div className="divide-y divide-[hsl(var(--ui-border))]">
                    {children}
                </div>
            </Card>
        </section>
    );
}
