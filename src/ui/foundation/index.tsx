import * as React from 'react';
import Link from 'next/link';
import { ArrowUpRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge, Button, Card, CardContent, CardHeader } from '@/ui/components';
import { DataTable, type DataTableProps } from '@/ui/components/data-table';

type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'critical';

function toneClasses(tone: Tone) {
    if (tone === 'critical') {
        return 'border-[hsl(var(--ui-danger)/0.24)] bg-[hsl(var(--ui-danger)/0.1)] text-[hsl(var(--ui-danger-ink))]';
    }
    if (tone === 'info') {
        return 'border-[hsl(var(--ui-accent-blue)/0.18)] bg-[hsl(var(--ui-accent-blue)/0.08)] text-[hsl(var(--ui-accent-blue-ink))]';
    }
    if (tone === 'success') {
        return 'border-[hsl(var(--ui-success)/0.2)] bg-[hsl(var(--ui-success)/0.08)] text-[hsl(var(--ui-success-ink))]';
    }
    if (tone === 'warning') {
        return 'border-amber-300/70 bg-amber-500/10 text-amber-800 dark:text-amber-200';
    }
    if (tone === 'danger') {
        return 'border-[hsl(var(--ui-danger)/0.2)] bg-[hsl(var(--ui-danger)/0.08)] text-[hsl(var(--ui-danger-ink))]';
    }
    return 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text-muted))]';
}

export function ShellContainer({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn('flex flex-col gap-6 xl:gap-7', className)}>{children}</div>;
}

export function ContentGrid({
    main,
    side,
    className,
}: {
    main: React.ReactNode;
    side?: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]', className)}>
            <div className="min-w-0 space-y-6">{main}</div>
            {side ? <aside className="space-y-6">{side}</aside> : null}
        </div>
    );
}

export function PageHeader({
    eyebrow,
    title,
    description,
    actions,
    meta,
}: {
    eyebrow?: string;
    title: string;
    description: string;
    actions?: React.ReactNode;
    meta?: React.ReactNode;
}) {
    return (
        <div className="rounded-[1.75rem] border border-[hsl(var(--ui-border))] bg-[linear-gradient(180deg,hsl(var(--ui-surface))_0%,hsl(var(--ui-page))_140%)] p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-4xl">
                    {eyebrow ? (
                        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[hsl(var(--ui-text-subtle))]">
                            {eyebrow}
                        </p>
                    ) : null}
                    <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[hsl(var(--ui-text))] md:text-[2.25rem]">
                        {title}
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-[hsl(var(--ui-text-muted))] md:text-[15px]">
                        {description}
                    </p>
                    {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
                </div>
                {actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
            </div>
        </div>
    );
}

export function ModuleNav({
    items,
    className,
}: {
    items: Array<{ label: string; current?: boolean; detail?: string }>;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-wrap gap-2', className)}>
            {items.map((item) => (
                <div
                    key={item.label}
                    className={cn(
                        'min-w-[10rem] rounded-2xl border px-3 py-3',
                        item.current
                            ? 'border-[hsl(var(--ui-accent-blue)/0.2)] bg-[hsl(var(--ui-accent-blue)/0.08)]'
                            : 'border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]'
                    )}
                >
                    <p className={cn('text-xs font-semibold uppercase tracking-[0.12em]', item.current ? 'text-[hsl(var(--ui-accent-blue-ink))]' : 'text-[hsl(var(--ui-text-subtle))]')}>
                        {item.label}
                    </p>
                    {item.detail ? (
                        <p className="mt-1 text-xs leading-5 text-[hsl(var(--ui-text-muted))]">{item.detail}</p>
                    ) : null}
                </div>
            ))}
        </div>
    );
}

export function SectionHeader({
    title,
    description,
    actions,
}: {
    title: string;
    description?: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
                <h2 className="text-lg font-semibold tracking-[-0.02em] text-[hsl(var(--ui-text))]">{title}</h2>
                {description ? <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{description}</p> : null}
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
    );
}

export function SurfacePanel({
    children,
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <section className={cn('rounded-[1.5rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-5 shadow-sm', className)}>
            {children}
        </section>
    );
}

export function StatusChip({
    label,
    tone = 'neutral',
}: {
    label: string;
    tone?: Tone;
}) {
    return <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.08em]', toneClasses(tone))}>{label}</span>;
}

export function MetricCard({
    label,
    value,
    helper,
    tone = 'neutral',
    href,
}: {
    label: string;
    value: string;
    helper: string;
    tone?: Tone;
    href?: string;
}) {
    const card = (
        <Card className="rounded-[1.5rem] border-[hsl(var(--ui-border))] shadow-none">
            <CardHeader
                className="pb-0"
                heading={<span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[hsl(var(--ui-text-subtle))]">{label}</span>}
                actions={<StatusChip label={tone === 'neutral' ? 'tracking' : tone} tone={tone} />}
            />
            <CardContent className="pt-4">
                <p className="text-[2rem] font-semibold tracking-[-0.04em] text-[hsl(var(--ui-text))]">{value}</p>
                <p className="mt-2 text-sm leading-5 text-[hsl(var(--ui-text-muted))]">{helper}</p>
            </CardContent>
        </Card>
    );

    if (href) {
        return (
            <Link href={href} className="block transition-transform hover:-translate-y-0.5">
                {card}
            </Link>
        );
    }

    return card;
}

export function KPIStrip({
    items,
}: {
    items: Array<{ label: string; value: string; helper: string; tone?: Tone; href?: string }>;
}) {
    return (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {items.map((item) => (
                <MetricCard key={item.label} {...item} />
            ))}
        </div>
    );
}

export function AlertBlock({
    title,
    description,
    tone = 'info',
    action,
}: {
    title: string;
    description: string;
    tone?: Tone;
    action?: string;
}) {
    return (
        <div className={cn('rounded-2xl border px-4 py-4', toneClasses(tone))}>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="mt-1 text-sm leading-6 opacity-90">{description}</p>
                </div>
                {action ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.08em]">
                        {action}
                        <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                ) : null}
            </div>
        </div>
    );
}

export function EmptyState({
    title,
    description,
    actionLabel,
}: {
    title: string;
    description: string;
    actionLabel?: string;
}) {
    return (
        <div className="rounded-[1.5rem] border border-dashed border-[hsl(var(--ui-border-strong))] bg-[hsl(var(--ui-page))] px-6 py-10 text-center">
            <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{title}</p>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{description}</p>
            {actionLabel ? <Button variant="secondary" className="mt-4">{actionLabel}</Button> : null}
        </div>
    );
}

export function LoadingState({
    title = 'Carregando estrutura operacional',
    description = 'Preparando contexto, estados e blocos da interface.',
}: {
    title?: string;
    description?: string;
}) {
    return (
        <div className="rounded-[1.5rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-6">
            <div className="animate-pulse">
                <div className="h-5 w-56 rounded-full bg-[hsl(var(--ui-border))]" />
                <div className="mt-3 h-4 w-80 rounded-full bg-[hsl(var(--ui-border))]" />
                <div className="mt-6 grid gap-3 md:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="h-24 rounded-2xl bg-[hsl(var(--ui-border))]" />
                    ))}
                </div>
            </div>
            <p className="mt-6 text-sm font-semibold text-[hsl(var(--ui-text))]">{title}</p>
            <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{description}</p>
        </div>
    );
}

export function SearchInput({
    placeholder,
    value,
    className,
    onChange,
    readOnly,
}: {
    placeholder: string;
    value?: string;
    className?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    readOnly?: boolean;
}) {
    return (
        <label className={cn('relative block min-w-[18rem] flex-1', className)}>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[hsl(var(--ui-text-subtle))]" />
            <input
                readOnly={readOnly ?? !onChange}
                value={value ?? ''}
                placeholder={placeholder}
                onChange={onChange}
                className="h-11 w-full rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] pl-9 pr-3 text-sm text-[hsl(var(--ui-text))] outline-none placeholder:text-[hsl(var(--ui-text-subtle))]"
            />
        </label>
    );
}

export function FilterBar({
    children,
    className,
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn('flex flex-col gap-3 rounded-[1.5rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4 md:flex-row md:flex-wrap md:items-center', className)}>
            {children}
        </div>
    );
}

export type SimpleTableColumn = {
    key: string;
    label: string;
    align?: 'left' | 'right';
};

export function SimpleDataTable({
    columns,
    rows,
}: {
    columns: SimpleTableColumn[];
    rows: Array<Record<string, React.ReactNode>>;
}) {
    return (
        <div className="overflow-hidden rounded-[1.25rem] border border-[hsl(var(--ui-border))]">
            <div className="overflow-auto">
                <table className="min-w-full text-sm">
                    <thead className="bg-[hsl(var(--ui-page))]">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={cn(
                                        'px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]',
                                        column.align === 'right' ? 'text-right' : 'text-left'
                                    )}
                                >
                                    {column.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))]">
                        {rows.map((row, rowIndex) => (
                            <tr key={rowIndex}>
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={cn(
                                            'px-4 py-3 align-top text-[hsl(var(--ui-text))]',
                                            column.align === 'right' ? 'text-right' : 'text-left'
                                        )}
                                    >
                                        {row[column.key]}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export function DataTableBase<TData, TValue>(props: DataTableProps<TData, TValue>) {
    return <DataTable {...props} />;
}

export function EventList({
    items,
}: {
    items: Array<{ title: string; time: string; detail: string; tone?: Tone; type?: string; entity?: string; href?: string }>;
}) {
    return (
        <div className="space-y-3">
            {items.map((item) => (
                item.href ? (
                    <Link
                        key={`${item.time}-${item.title}`}
                        href={item.href}
                        className="block transition-transform hover:-translate-y-0.5"
                    >
                        <div className="flex gap-3 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                            <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.tone === 'critical' || item.tone === 'danger' ? 'bg-[hsl(var(--ui-danger))]' : item.tone === 'warning' ? 'bg-amber-500' : item.tone === 'success' ? 'bg-[hsl(var(--ui-success))]' : 'bg-[hsl(var(--ui-accent-blue))]')} />
                            <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.title}</p>
                                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">{item.time}</p>
                                </div>
                                {item.type || item.entity ? (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {item.type ? <StatusChip label={item.type} tone={item.tone ?? 'info'} /> : null}
                                        {item.entity ? <StatusChip label={item.entity} tone="neutral" /> : null}
                                    </div>
                                ) : null}
                                <p className="mt-1 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{item.detail}</p>
                            </div>
                        </div>
                    </Link>
                ) : (
                    <div key={`${item.time}-${item.title}`} className="flex gap-3 rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] p-4">
                        <div className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', item.tone === 'critical' || item.tone === 'danger' ? 'bg-[hsl(var(--ui-danger))]' : item.tone === 'warning' ? 'bg-amber-500' : item.tone === 'success' ? 'bg-[hsl(var(--ui-success))]' : 'bg-[hsl(var(--ui-accent-blue))]')} />
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">{item.title}</p>
                                <p className="text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">{item.time}</p>
                            </div>
                            {item.type || item.entity ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {item.type ? <StatusChip label={item.type} tone={item.tone ?? 'info'} /> : null}
                                    {item.entity ? <StatusChip label={item.entity} tone="neutral" /> : null}
                                </div>
                            ) : null}
                            <p className="mt-1 text-sm leading-6 text-[hsl(var(--ui-text-muted))]">{item.detail}</p>
                        </div>
                    </div>
                )
            ))}
        </div>
    );
}

export function InfoPanel({
    title,
    children,
    footer,
    className,
}: {
    title: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    className?: string;
}) {
    return (
        <SurfacePanel className={className}>
            <SectionHeader title={title} />
            <div className="mt-4 space-y-3">{children}</div>
            {footer ? <div className="mt-4 border-t border-[hsl(var(--ui-border))] pt-4">{footer}</div> : null}
        </SurfacePanel>
    );
}

export const SidePanel = InfoPanel;
export const DrawerBase = InfoPanel;

export function EntitySummaryCard({
    title,
    subtitle,
    status,
    fields,
}: {
    title: string;
    subtitle: string;
    status: { label: string; tone?: Tone };
    fields: Array<{ label: string; value: string }>;
}) {
    return (
        <SurfacePanel>
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-semibold tracking-[-0.02em] text-[hsl(var(--ui-text))]">{title}</p>
                    <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{subtitle}</p>
                </div>
                <StatusChip label={status.label} tone={status.tone} />
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {fields.map((field) => (
                    <div key={field.label} className="rounded-2xl border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] px-4 py-3">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[hsl(var(--ui-text-subtle))]">{field.label}</p>
                        <p className="mt-2 text-sm font-medium text-[hsl(var(--ui-text))]">{field.value}</p>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    );
}
