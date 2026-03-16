import Link from 'next/link';
import { Button } from '@/ui/components';
import { Package, Truck, CheckCircle2, Clock } from 'lucide-react';
import { SectionHeader, StatusChip, SurfacePanel } from '@/ui/foundation';
import type { ClientOrderActivity, ClientOrderStatus } from '../types';

function getStatusColor(status: ClientOrderStatus) {
    if (status === 'aguardando-aprovacao') {
        return 'warning' as const;
    }
    if (status === 'coleta') {
        return 'info' as const;
    }
    if (status === 'entregue') {
        return 'success' as const;
    }
    return 'neutral' as const;
}

export function ClientOrders({
    clientId,
    items,
    title = 'Ultimos pedidos',
    description = 'Pedidos recentes e status mais relevantes para a operacao.',
    compact = false,
}: {
    clientId: string;
    items: ClientOrderActivity[];
    title?: string;
    description?: string;
    compact?: boolean;
}) {
    return (
        <SurfacePanel>
            <SectionHeader
                title={title}
                description={description}
                actions={
                    <Link href={`/pedidos?cliente=${clientId}`}>
                        <Button variant="secondary" size="sm">Abrir em pedidos</Button>
                    </Link>
                }
            />
            <div className="mt-4 space-y-3">
                {items.slice(0, compact ? 2 : 3).map((item) => (
                    <div key={item.id} className="rounded-[1rem] border border-[hsl(var(--ui-border))] bg-[hsl(var(--ui-page))] p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-[hsl(var(--ui-text))]">Pedido #{item.id}</p>
                                <p className="mt-1 text-sm text-[hsl(var(--ui-text-muted))]">{item.total}</p>
                            </div>
                            <StatusChip label={item.status} tone={getStatusColor(item.status)} />
                        </div>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.08em] text-[hsl(var(--ui-text-subtle))]">
                            {item.updatedAt}
                        </p>
                    </div>
                ))}
            </div>
        </SurfacePanel>
    );
}
