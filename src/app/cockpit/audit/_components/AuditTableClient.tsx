'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { Badge } from '@/ui/components/badge';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterBar } from '@/ui/components/filters/FilterBar';
import { AuditFilterSchema, AUDIT_FILTER_KEYS } from '@/ui/components/filters/schemas/audit';

export type AuditLog = {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    resource: string;
    status: 'success' | 'failure' | 'pending';
};

const columns: ColumnDef<AuditLog>[] = [
    {
        accessorKey: 'timestamp',
        header: 'Data/Hora',
        cell: ({ row }) => {
            const date = new Date(row.original.timestamp);
            return <span>{date.toLocaleString('pt-BR')}</span>;
        },
    },
    {
        accessorKey: 'actor',
        header: 'Usuário',
        enableSorting: false, // sorting by actor usually complex based on relations, disabling for now
    },
    {
        accessorKey: 'action',
        header: 'Ação',
    },
    {
        accessorKey: 'resource',
        header: 'Recurso',
        enableSorting: false, // same
    },
    {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
            const status = row.original.status;
            let variant: 'success' | 'danger' | 'muted' | 'default' = 'default';
            let label: string = status;

            if (status === 'success') {
                variant = 'success';
                label = 'Sucesso';
            } else if (status === 'failure') {
                variant = 'danger';
                label = 'Falha';
            } else if (status === 'pending') {
                variant = 'muted';
                label = 'Pendente';
            }

            return <Badge variant={variant}>{label}</Badge>;
        },
    },
];

interface AuditTableClientProps {
    data: AuditLog[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    initialError?: boolean;
    requestId?: string;
}

export function AuditTableClient({ data, meta, initialError, requestId }: AuditTableClientProps) {
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
        return [{ id: 'timestamp', desc: true }];
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

    return (
        <div className="flex flex-col gap-2 relative">
            <FilterBar<AuditFilterSchema>
                allowedKeys={AUDIT_FILTER_KEYS}
                storageKey="condstore.savedViews.audit"
                drawerContent={(localFilters, setLocalFilters) => (
                    <>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Tipo de Evento</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                value={localFilters.type || ''}
                                onChange={e => setLocalFilters({ ...localFilters, type: e.target.value })}
                            >
                                <option value="" className="bg-[hsl(var(--ui-surface))]">Todos</option>
                                <option value="USER_LOGIN" className="bg-[hsl(var(--ui-surface))]">USER_LOGIN</option>
                                <option value="ITEM_UPDATED" className="bg-[hsl(var(--ui-surface))]">ITEM_UPDATED</option>
                                <option value="BILLING_FAILED" className="bg-[hsl(var(--ui-surface))]">BILLING_FAILED</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Status</label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                value={localFilters.status || ''}
                                onChange={e => setLocalFilters({ ...localFilters, status: e.target.value })}
                            >
                                <option value="" className="bg-[hsl(var(--ui-surface))]">Todos</option>
                                <option value="success" className="bg-[hsl(var(--ui-surface))]">Sucesso</option>
                                <option value="failure" className="bg-[hsl(var(--ui-surface))]">Falha</option>
                                <option value="pending" className="bg-[hsl(var(--ui-surface))]">Pendente</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Ator / Tenant</label>
                            <input
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                placeholder="Buscar ator..."
                                value={localFilters.actor || ''}
                                onChange={e => setLocalFilters({ ...localFilters, actor: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Recurso</label>
                            <input
                                className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                placeholder="Buscar recurso..."
                                value={localFilters.resource || ''}
                                onChange={e => setLocalFilters({ ...localFilters, resource: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data Início</label>
                                <input
                                    type="date"
                                    className="w-full h-10 px-3 rounded-md border border-[hsl(var(--ui-border))] bg-transparent text-sm text-[hsl(var(--ui-text))] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--ui-accent-blue))]"
                                    value={localFilters.dateStart || ''}
                                    onChange={e => setLocalFilters({ ...localFilters, dateStart: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-[hsl(var(--ui-text))]">Data Fim</label>
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
                <span>Mostrando {data.length} de {meta.total} transações</span>
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
