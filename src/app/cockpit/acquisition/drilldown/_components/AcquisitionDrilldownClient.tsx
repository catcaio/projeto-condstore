'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { ColumnDef, SortingState } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { Badge } from '@/ui/components/badge';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export type DrilldownLog = {
    id: string;
    timestamp: string;
    type: string;
    action: string;
};

const columns: ColumnDef<DrilldownLog>[] = [
    {
        accessorKey: 'timestamp',
        header: 'Data/Hora',
        cell: ({ row }) => {
            const date = new Date(row.original.timestamp);
            return <span>{date.toLocaleString('pt-BR')}</span>;
        },
    },
    {
        accessorKey: 'type',
        header: 'Tipo',
        cell: ({ row }) => {
            const type = row.original.type;
            let variant: 'success' | 'warning' | 'default' | 'info' = 'default';
            if (type === 'SIMULATION') variant = 'success';
            if (type === 'PUBLIC_EVENT') variant = 'info';
            if (type === 'CLICK') variant = 'warning';
            return <Badge variant={variant as any}>{type}</Badge>;
        }
    },
    {
        accessorKey: 'action',
        header: 'Ação Registrada',
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.action}</span>
    }
];

interface AcquisitionDrilldownClientProps {
    data: DrilldownLog[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
    initialError?: boolean;
    requestId?: string;
}

export function AcquisitionDrilldownClient({ data, meta, initialError, requestId }: AcquisitionDrilldownClientProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    const [sorting, setSorting] = useState<SortingState>(() => {
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

    // Handle Sorting (dummy since API might not support sorting dynamically for union)
    const handleSortingChange = (newSorting: SortingState) => {
        setSorting(newSorting);
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
            <div className="text-sm font-medium text-[hsl(var(--ui-text-muted))] mb-2 border-b border-[hsl(var(--ui-border))] pb-2 flex justify-between items-center">
                <span>Mostrando {data.length} de {meta.total} eventos vinculados</span>
                <button
                    onClick={() => router.push('/cockpit/acquisition')}
                    className="text-[hsl(var(--ui-accent-blue))] hover:underline text-xs"
                >
                    &larr; Voltar para Acquisition
                </button>
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
