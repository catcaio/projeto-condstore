import React from 'react';
import Link from 'next/link';
import { FileSearch } from 'lucide-react';

export interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
}

export function EmptyState({ title, description, actionLabel, actionHref }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-[hsl(var(--ui-border)/0.8)] rounded-xl bg-[hsl(var(--ui-bg)/0.5)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--ui-muted))] text-[hsl(var(--ui-text-muted))] mb-4">
                <FileSearch className="h-6 w-6" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--ui-text))]">{title}</h3>
            <p className="mb-6 text-sm text-[hsl(var(--ui-text-muted))] max-w-sm">
                {description}
            </p>
            {actionLabel && actionHref && (
                <Link
                    href={actionHref}
                    className="inline-flex h-9 items-center justify-center rounded-lg bg-[hsl(var(--ui-text))] px-4 text-sm font-medium text-[hsl(var(--ui-bg))] transition-colors hover:opacity-90"
                >
                    {actionLabel}
                </Link>
            )}
        </div>
    );
}
