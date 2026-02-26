'use client';

import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/ui/components/data-table';
import { Badge } from '@/ui/components/badge';

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
    if (initialError) {
        return <DataTable columns={columns} data={[]} isError errorRequestId={requestId} />;
    }

    return (
        <DataTable
            columns={columns}
            data={initialData}
            initialSorting={[{ id: 'timestamp', desc: true }]}
            searchKey="action"
            searchPlaceholder="Buscar por ação..."
        />
    );
}
