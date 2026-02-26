'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterBar } from '@/ui/components/filters/FilterBar';
import { AcquisitionFilterSchema, ACQUISITION_FILTER_KEYS } from '@/ui/components/filters/schemas/acquisition';

export type AcquisitionRow = {
    key: string;
    total_click_tokens: number;
    total_consumed_tokens: number;
    total_events: number;
    funnel_started: number;
    freight_simulations: number;
    conversion_rate_1: number;
    conversion_rate_2: number;
};

const formatPercent = (val: number) => {
    return (val * 100).toFixed(2) + '%';
};

const columns: ColumnDef<AcquisitionRow>[] = [
    {
        accessorKey: 'key',
        header: 'Fonte / Campanha',
        cell: ({ row }) => <span className="font-semibold">{row.original.key}</span>,
    },
    {
        accessorKey: 'total_click_tokens',
        header: 'Cliques (Tokens)',
    },
    {
        accessorKey: 'total_events',
        header: 'Total de Eventos',
    },
    {
        accessorKey: 'total_consumed_tokens',
        header: 'Sessões (Tokens Consumidos)',
    },
    {
        accessorKey: 'conversion_rate_1',
        header: 'Conv. Cliques \u2192 Sessões',
        cell: ({ row }) => <span>{formatPercent(row.original.conversion_rate_1)}</span>,
    },
    {
        accessorKey: 'freight_simulations',
        header: 'Simulações de Frete',
    },
    {
        accessorKey: 'conversion_rate_2',
        header: 'Conv. Sessões \u2192 Simulação',
        cell: ({ row }) => <span>{formatPercent(row.original.conversion_rate_2)}</span>,
    },
];

interface AcquisitionClientProps {
    data: AcquisitionRow[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    totals: any;
    initialError?: boolean;
    requestId?: string;
}

export function AcquisitionClient({ data, meta, totals, initialError, requestId }: AcquisitionClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [sorting, setSorting] = useState<SortingState>(() => {
        const sort = searchParams.get('sort');
        const order = searchParams.get('order');
        if (sort) {
            return [{ id: sort, desc: order === 'desc' }];
        }
        return [{ id: 'total_click_tokens', desc: true }];
    });

    const [pagination, setPagination] = useState({
        pageIndex: meta.page - 1,
        pageSize: meta.limit
    });

    useEffect(() => {
        setPagination({
            pageIndex: meta.page - 1,
            pageSize: meta.limit
        });
    }, [meta.page, meta.limit]);

    // Handle Sorting
    const handleSortingChange = (newSorting: SortingState) => {
        setSorting(newSorting);
        const params = new URLSearchParams(searchParams.toString());

        if (newSorting.length > 0) {
            params.set('sort', newSorting[0].id);
            params.set('order', newSorting[0].desc ? 'desc' : 'asc');
        } else {
            params.delete('sort');
            params.delete('order');
        }
        // reset pagination on sorting change
        params.set('page', '1');

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    // Handle Pagination
    const handlePaginationChange = (newPagination: { pageIndex: number, pageSize: number }) => {
        setPagination(newPagination);
        const params = new URLSearchParams(searchParams.toString());

        params.set('page', (newPagination.pageIndex + 1).toString());
        params.set('limit', newPagination.pageSize.toString());

        startTransition(() => {
            router.replace(`${pathname}?${params.toString()}`, { scroll: false });
        });
    };

    if (initialError) {
        return <DataTable columns={columns} data={[]} isError errorRequestId={requestId} />;
    }

    const handleRowClick = (row: AcquisitionRow) => {
        const params = new URLSearchParams(searchParams.toString());
        const groupBy = params.get('groupBy') || 'utm_source';

        if (groupBy === 'utm_source') {
            params.set('utm_source', row.key);
        } else {
            params.set('utm_campaign', row.key);
        }

        // Remove table state from parent view
        params.delete('page');
        params.delete('limit');
        params.delete('sort');
        params.delete('order');

        router.push(`/cockpit/acquisition/drilldown?${params.toString()}`);
    };

    return (
        <div className="flex flex-col gap-6 relative">
            {totals && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-md">
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] mb-1">Total de Cliques</div>
                        <div className="text-2xl font-bold">{totals.total_click_tokens?.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-md">
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] mb-1">Sessões Iniciais</div>
                        <div className="text-2xl font-bold">{totals.total_consumed_tokens?.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-md">
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] mb-1">Inícios de Funil</div>
                        <div className="text-2xl font-bold">{totals.funnel_started?.toLocaleString('pt-BR')}</div>
                    </div>
                    <div className="bg-[hsl(var(--ui-surface))] border border-[hsl(var(--ui-border))] p-4 rounded-md">
                        <div className="text-sm text-[hsl(var(--ui-text-muted))] mb-1">Simulações de Frete</div>
                        <div className="text-2xl font-bold flex gap-2 items-baseline">
                            {totals.freight_simulations?.toLocaleString('pt-BR')}
                            <span className="text-sm font-medium text-[hsl(var(--ui-success))]">
                                {formatPercent(totals.conversion_rate_2)} conv
                            </span>
                        </div>
                    </div>
                </div>
            )}

            <FilterBar<AcquisitionFilterSchema>
                allowedKeys={ACQUISITION_FILTER_KEYS}
                storageKey="condstore.savedViews.acquisition"
                defaults={{ groupBy: 'utm_source' }}
                searchPlaceholder="Buscar source ou campanha (q)..."
                fastFilters={(filters, updateFilter) => (
                    <div className="flex bg-[hsl(var(--ui-muted))] rounded-md p-1 border border-[hsl(var(--ui-border))]">
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filters.groupBy === 'utm_source'
                                || !filters.groupBy
                                ? 'bg-[hsl(var(--ui-surface))] shadow-sm text-[hsl(var(--ui-text))]'
                                : 'text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            onClick={() => updateFilter('groupBy', 'utm_source')}
                        >
                            By Origem
                        </button>
                        <button
                            className={`px-3 py-1.5 text-xs font-medium rounded-sm transition-colors ${filters.groupBy === 'utm_campaign'
                                ? 'bg-[hsl(var(--ui-surface))] shadow-sm text-[hsl(var(--ui-text))]'
                                : 'text-[hsl(var(--ui-text-muted))] hover:text-[hsl(var(--ui-text))]'
                                }`}
                            onClick={() => updateFilter('groupBy', 'utm_campaign')}
                        >
                            By Campanha
                        </button>
                    </div>
                )}
                drawerContent={(localFilters, setLocalFilters) => (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Agrupar Por</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                value={localFilters.groupBy || 'utm_source'}
                                onChange={e => setLocalFilters({ ...localFilters, groupBy: e.target.value })}
                            >
                                <option value="utm_source" className="bg-[hsl(var(--ui-surface))]">UTM Source</option>
                                <option value="utm_campaign" className="bg-[hsl(var(--ui-surface))]">UTM Campaign</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">UTM Source</label>
                            <input
                                placeholder="Ex: facebook, google"
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] transition-shadow"
                                value={localFilters.utm_source || ''}
                                onChange={e => setLocalFilters({ ...localFilters, utm_source: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">UTM Campaign</label>
                            <input
                                placeholder="Ex: blackfriday, summer_sale"
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-surface))] text-[hsl(var(--ui-text))] text-sm focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))] transition-shadow"
                                value={localFilters.utm_campaign || ''}
                                onChange={e => setLocalFilters({ ...localFilters, utm_campaign: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Início (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                    value={localFilters.dateStart || ''}
                                    onChange={e => setLocalFilters({ ...localFilters, dateStart: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Fim (Opcional)</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                    value={localFilters.dateEnd || ''}
                                    onChange={e => setLocalFilters({ ...localFilters, dateEnd: e.target.value })}
                                />
                            </div>
                        </div>
                    </>
                )}
            />

            <div className="text-sm font-medium text-[hsl(var(--ui-text-muted))] mb-2 border-b border-[hsl(var(--ui-border))] pb-2 flex justify-between items-center">
                <span>Mostrando {data.length} de {meta.total} origens/campanhas</span>
            </div>

            <div className={isPending ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                <DataTable
                    columns={columns}
                    data={data}
                    manualPagination
                    manualSorting
                    pageCount={meta.totalPages}
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                    pagination={pagination}
                    onPaginationChange={handlePaginationChange}
                    onRowClick={handleRowClick}
                />
            </div>

            {isPending && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[hsl(var(--ui-surface))]/20 backdrop-blur-[1px]">
                    <div className="h-6 w-6 rounded-full border-2 border-[hsl(var(--ui-border))] border-t-[hsl(var(--ui-accent-blue))] animate-spin" />
                </div>
            )}
        </div>
    );
}
