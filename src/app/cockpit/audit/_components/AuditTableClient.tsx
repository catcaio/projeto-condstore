'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { Badge } from '@/ui/components/badge';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { FilterBar } from '@/ui/components/filters/FilterBar';

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
            <FilterBar />

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
