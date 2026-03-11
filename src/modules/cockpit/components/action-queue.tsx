import Link from 'next/link';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTableBase, EmptyState, SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { CockpitActionQueueItem } from '../data/shared';
import { cockpitActionQueue } from '../mock-data';

const columns: ColumnDef<CockpitActionQueueItem>[] = [
    {
        accessorKey: 'queue',
        header: 'Fila',
    },
    {
        accessorKey: 'entity',
        header: 'Entidade',
        cell: ({ row }) => (
            <Link
                href={row.original.href}
                className="font-medium text-[hsl(var(--ui-accent-blue-ink))] hover:underline"
            >
                {row.original.entity}
            </Link>
        ),
    },
    {
        accessorKey: 'waitingFor',
        header: 'Aguardando',
    },
    {
        accessorKey: 'age',
        header: 'Aging',
    },
    {
        accessorKey: 'owner',
        header: 'Owner',
    },
    {
        accessorKey: 'priority',
        header: 'Prioridade',
        cell: ({ row }) => {
            const priority = row.original.priority;
            return (
                <StatusChip
                    label={priority}
                    tone={priority === 'critical' ? 'critical' : priority === 'warning' ? 'warning' : 'info'}
                />
            );
        },
    },
];

export function ActionQueue({ items = cockpitActionQueue }: { items?: CockpitActionQueueItem[] }) {
    return (
        <SurfacePanel className="h-full">
            <SectionHeader
                title="Filas de acao"
                description="Itens que precisam de resposta humana agora, sem depender de leitura analitica."
            />
            <div className="mt-4">
                {items.length === 0 ? (
                    <EmptyState
                        title="Fila sem pendencias"
                        description="Nao ha itens em backlog imediato para atendimento, pedidos ou logistica."
                    />
                ) : (
                    <DataTableBase columns={columns} data={items} />
                )}
            </div>
        </SurfacePanel>
    );
}
