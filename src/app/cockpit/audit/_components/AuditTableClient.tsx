'use client';

import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { Badge } from '@/ui/components/badge';
import { useSearchParams } from 'next/navigation';
import { parseFiltersFromSearchParams } from '@/ui/components/filters/url-state';
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
    },
    {
        accessorKey: 'action',
        header: 'Ação',
    },
    {
        accessorKey: 'resource',
        header: 'Recurso',
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
    initialData: AuditLog[];
    initialError?: boolean;
    requestId?: string;
}

export function AuditTableClient({ initialData, initialError, requestId }: AuditTableClientProps) {
    const searchParams = useSearchParams();
    const filters = parseFiltersFromSearchParams(searchParams);

    const filteredData = useMemo(() => {
        let data = [...initialData];

        if (filters.q) {
            const q = filters.q.toLowerCase();
            data = data.filter(item =>
                item.action.toLowerCase().includes(q) ||
                item.actor.toLowerCase().includes(q) ||
                item.resource.toLowerCase().includes(q)
            );
        }

        if (filters.type) {
            data = data.filter(item => item.action === filters.type);
        }

        if (filters.status) {
            data = data.filter(item => item.status === filters.status);
        }

        if (filters.actor) {
            data = data.filter(item => item.actor.toLowerCase().includes(filters.actor!.toLowerCase()));
        }

        if (filters.resource) {
            data = data.filter(item => item.resource.toLowerCase().includes(filters.resource!.toLowerCase()));
        }

        if (filters.dateStart) {
            const start = new Date(filters.dateStart).getTime();
            data = data.filter(item => new Date(item.timestamp).getTime() >= start);
        }

        if (filters.dateEnd) {
            // Include until end of day
            const end = new Date(filters.dateEnd);
            end.setHours(23, 59, 59, 999);
            data = data.filter(item => new Date(item.timestamp).getTime() <= end.getTime());
        }

        return data;
    }, [initialData, filters]);

    if (initialError) {
        return <DataTable columns={columns} data={[]} isError errorRequestId={requestId} />;
    }

    return (
        <div className="flex flex-col gap-2">
            <FilterBar />

            <div className="text-sm font-medium text-[hsl(var(--ui-text-muted))] mb-2 border-b border-[hsl(var(--ui-border))] pb-2">
                Mostrando {filteredData.length} de {initialData.length} transações
            </div>

            <DataTable
                columns={columns}
                data={filteredData}
                initialSorting={[{ id: 'timestamp', desc: true }]}
            />
        </div>
    );
}
